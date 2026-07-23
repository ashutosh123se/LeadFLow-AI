const express = require('express');
const router = express.Router();
const axios = require('axios');
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const redisClient = require('../../config/redisClient');
const sarvamConfig = require('../../config/sarvam');
const deepgramConfig = require('../../config/deepgram');
const openaiConfig = require('../../config/openai');
const { emitToOrg } = require('../../config/socket');
const whatsappQueue = require('../../queues/whatsappQueue');
const callQueue = require('../../queues/callQueue');
const emailQueue = require('../../queues/emailQueue');
const verifyExotelWebhook = require('../../middleware/verifyExotelWebhook');
const { resolvePostCallAnalysis } = require('../../utils/callScoring');
const UsageService = require('../billing/usage.service');

router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return verifyExotelWebhook(req, res, next);
});

// Helper: Generate TTS audio base64 via Sarvam AI
const generateSarvamTTS = async (text, language, voice = 'meera') => {
  try {
    if (!sarvamConfig.apiKey) {
      logger.warn('Sarvam API key not found for TTS synthesis. Using fallback.');
      return null;
    }

    const targetLangCode = language === 'english' ? 'en-IN' : 'hi-IN';
    
    const response = await axios.post(
      `${sarvamConfig.apiUrl}/text-to-speech`,
      {
        inputs: [text],
        target_language_code: targetLangCode,
        speaker: voice,
        model: 'bulbul:v1'
      },
      {
        headers: {
          'api-subscription-key': sarvamConfig.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const base64Audio = response.data?.audios?.[0];
    return base64Audio || null;
  } catch (error) {
    logger.error('Sarvam TTS generation failed in webhook:', error.response?.data || error.message);
    return null;
  }
};

// 1. Audio Server route - GET /api/v1/webhooks/exotel/audio/:audioId
router.get('/audio/:audioId', async (req, res) => {
  const { audioId } = req.params;
  logger.info(`Audio download request for key: ${audioId}`);
  
  try {
    let redisKey = `audio:${audioId}`;
    if (audioId.endsWith('-greeting')) {
      const callId = audioId.replace('-greeting', '');
      redisKey = `call:${callId}:greeting`;
    }

    const base64Content = await redisClient.get(redisKey);
    if (!base64Content) {
      logger.warn(`Redis cache miss for audio key: ${redisKey}`);
      return res.status(404).send('Audio segment not found or expired.');
    }

    const audioBuffer = Buffer.from(base64Content, 'base64');
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Accept-Ranges': 'bytes'
    });
    return res.send(audioBuffer);
  } catch (error) {
    logger.error(`Error serving audio ${audioId}:`, error.message);
    return res.status(500).send('Internal server error serving audio.');
  }
});

// 2. TwiML Initialization - POST /api/v1/webhooks/exotel/twiml/:callId
router.post('/twiml/:callId', async (req, res) => {
  const { callId } = req.params;
  logger.info(`Exotel TwiML request for call ${callId}`);

  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true, organization: true },
    });

    if (!call) {
      return res.status(404).send('<Response><Hangup/></Response>');
    }

    const apiDomain = process.env.API_DOMAIN || req.protocol + '://' + req.get('host');
    const playUrl = `${apiDomain}/api/v1/webhooks/exotel/audio/${callId}-greeting`;
    const recordUrl = `${apiDomain}/api/v1/webhooks/exotel/recording/${callId}`;

    // Initialize conversation state in Redis
    const greetingText = call.language === 'hindi'
      ? `Namaste ${call.lead.name} ji, main LeadFlow-AI ki taraf se ${call.organization.name} ke liye call kar raha hoon. Kya aap abhi do minute de sakte hain?`
      : `Hello ${call.lead.name}, I am calling on behalf of ${call.organization.name} through LeadFlow-AI. Do you have two minutes?`;

    const initialState = {
      currentStep: 0,
      transcript: [{ speaker: 'assistant', text: greetingText, timestamp: new Date() }]
    };
    await redisClient.set(`call:${callId}:state`, JSON.stringify(initialState), { EX: 3600 });

    const twimlResponse = `
      <Response>
        <Play>${playUrl}</Play>
        <Record action="${recordUrl}" maxLength="30" playBeep="false"/>
      </Response>
    `;

    res.type('text/xml');
    res.send(twimlResponse.trim());
  } catch (error) {
    logger.error('Error in Exotel TwiML initialization:', error.message);
    res.status(500).send('<Response><Hangup/></Response>');
  }
});

// 3. Recording Callback - POST /api/v1/webhooks/exotel/recording/:callId
// Support both /recording/:callId and /response/:callId to capture all callbacks
const handleRecordingCallback = async (req, res) => {
  const { callId } = req.params;
  const recordingUrl = req.body.RecordingUrl || req.body.RecordUrl;
  logger.info(`Received recording callback for callId ${callId}: url=${recordingUrl}`);

  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true, organization: true },
    });

    if (!call) {
      return res.status(404).send('<Response><Hangup/></Response>');
    }

    // Retrieve state from Redis
    const stateStr = await redisClient.get(`call:${callId}:state`);
    let state = stateStr ? JSON.parse(stateStr) : { currentStep: 0, transcript: [] };

    // 1. Transcribe lead speech with Deepgram nova-2
    let userSpeech = '';
    if (recordingUrl && deepgramConfig.apiKey) {
      try {
        const response = await axios.post(
          'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
          { url: recordingUrl },
          {
            headers: {
              Authorization: `Token ${deepgramConfig.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        userSpeech = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        logger.info(`Transcribed lead voice response: "${userSpeech}"`);
      } catch (err) {
        logger.error('Deepgram transcription failed, falling back:', err.message);
      }
    }

    if (!userSpeech) {
      logger.error(`Deepgram returned empty transcript for call ${callId}. Marking NEEDS_REVIEW.`);
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'NEEDS_REVIEW',
          needsManualReview: true,
          endedAt: new Date(),
        },
      });
      emitToOrg(call.organizationId, 'call:failed', {
        leadId: call.leadId,
        callId,
        reason: 'Speech transcription failed — manual review required.',
      });
      res.type('text/xml');
      return res.send('<Response><Hangup/></Response>');
    }

    // Save lead turn to state transcript
    state.transcript.push({ speaker: 'lead', text: userSpeech, timestamp: new Date() });

    // Determine questions
    let questions = [];
    if (call.organization.qualifyQuestions) {
      try {
        questions = typeof call.organization.qualifyQuestions === 'string'
          ? JSON.parse(call.organization.qualifyQuestions)
          : call.organization.qualifyQuestions;
      } catch (e) {
        questions = [];
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      if (call.language === 'hindi') {
        questions = [
          'Aapka budget kitna hai is requirements ke liye?',
          'Aap is project ya product ko kab tak lena chahte hain?',
          'Kya aap isme main decision maker hain ya kisi aur se consult karenge?'
        ];
      } else if (call.language === 'hinglish') {
        questions = [
          'Aapka isme approximately kitna budget hai?',
          'Aapka buy karne ka timeline kab tak hai?',
          'Aapki product requirement details kya hain?'
        ];
      } else {
        questions = [
          'What is your approximate budget for this?',
          'What is your expected timeline for implementation?',
          'Could you share your specific business requirements?'
        ];
      }
    }

    const apiDomain = process.env.API_DOMAIN || req.protocol + '://' + req.get('host');
    const nextStep = state.currentStep + 1;
    let twimlResponse = '';

    if (nextStep <= questions.length) {
      const nextQuestion = questions[nextStep - 1];
      logger.info(`Next script question turn ${nextStep}: "${nextQuestion}"`);

      // Synthesize TTS
      const base64Audio = await generateSarvamTTS(
        nextQuestion,
        call.language,
        call.organization.aiCallerVoice
      );

      if (base64Audio) {
        await redisClient.set(`audio:${callId}-${nextStep}`, base64Audio, { EX: 600 });
        const playUrl = `${apiDomain}/api/v1/webhooks/exotel/audio/${callId}-${nextStep}`;
        const recordUrl = `${apiDomain}/api/v1/webhooks/exotel/recording/${callId}`;

        twimlResponse = `
          <Response>
            <Play>${playUrl}</Play>
            <Record action="${recordUrl}" maxLength="30" playBeep="false"/>
          </Response>
        `;
      } else {
        // Exotel Text-To-Speech fallback
        const recordUrl = `${apiDomain}/api/v1/webhooks/exotel/recording/${callId}`;
        twimlResponse = `
          <Response>
            <Say voice="female" language="${call.language === 'hindi' ? 'hi-IN' : 'en-US'}">${nextQuestion}</Say>
            <Record action="${recordUrl}" maxLength="30" playBeep="false"/>
          </Response>
        `;
      }

      state.currentStep = nextStep;
      state.transcript.push({ speaker: 'assistant', text: nextQuestion, timestamp: new Date() });
      await redisClient.set(`call:${callId}:state`, JSON.stringify(state), { EX: 3600 });
    } else {
      // End conversation
      const endText = call.language === 'hindi'
        ? 'Dhanyawad. Hamari sales team jald hi aapse aage ki baat karegi. Aapka din shubh ho.'
        : 'Thank you for your responses. Our representative will contact you shortly. Have a great day.';

      const base64Audio = await generateSarvamTTS(
        endText,
        call.language,
        call.organization.aiCallerVoice
      );

      if (base64Audio) {
        await redisClient.set(`audio:${callId}-conclusion`, base64Audio, { EX: 600 });
        const playUrl = `${apiDomain}/api/v1/webhooks/exotel/audio/${callId}-conclusion`;
        twimlResponse = `
          <Response>
            <Play>${playUrl}</Play>
            <Hangup/>
          </Response>
        `;
      } else {
        twimlResponse = `
          <Response>
            <Say voice="female" language="${call.language === 'hindi' ? 'hi-IN' : 'en-US'}">${endText}</Say>
            <Hangup/>
          </Response>
        `;
      }

      state.transcript.push({ speaker: 'assistant', text: endText, timestamp: new Date() });
      await redisClient.set(`call:${callId}:state`, JSON.stringify(state), { EX: 3600 });

      // Trigger asynchronous analysis
      setTimeout(() => processPostCall(callId), 1000);
    }

    res.type('text/xml');
    res.send(twimlResponse.trim());
  } catch (error) {
    logger.error('Error handling Exotel recording turn callback:', error.message);
    res.status(500).send('<Response><Hangup/></Response>');
  }
};

router.post('/recording/:callId', handleRecordingCallback);
router.post('/response/:callId', handleRecordingCallback);

// 4. Exotel Call Status Callback - POST /api/v1/webhooks/exotel/status/:callId
router.post('/status/:callId', async (req, res) => {
  const { callId } = req.params;
  const status = req.body.Status;
  const duration = parseInt(req.body.Duration || '0', 10);

  logger.info(`Call ${callId} status callback: status=${status}, duration=${duration}s`);

  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true },
    });

    if (!call) {
      return res.status(404).send('Call not found');
    }

    const callStatusMap = {
      'completed': 'COMPLETED',
      'no-answer': 'NO_ANSWER',
      'busy': 'BUSY',
      'failed': 'FAILED',
    };

    const callStatus = callStatusMap[status] || 'COMPLETED';

    await prisma.call.update({
      where: { id: callId },
      data: {
        status: callStatus,
        duration,
        endedAt: new Date(),
        answeredAt: callStatus === 'COMPLETED' ? new Date(Date.now() - duration * 1000) : null,
      },
    });

    // Handle missed call retry loops (up to 2 retries)
    if (callStatus === 'NO_ANSWER' || callStatus === 'BUSY' || callStatus === 'FAILED') {
      const retryKey = `call:${callId}:retries`;
      const retryCountStr = await redisClient.get(retryKey);
      const retryCount = retryCountStr ? parseInt(retryCountStr, 10) : 0;

      // Notify the organization via websocket
      emitToOrg(call.organizationId, 'call:failed', {
        leadId: call.leadId,
        leadName: call.lead.name,
        phone: call.lead.phone,
        reason: `Lead did not answer. Status: ${callStatus}. Attempt ${retryCount + 1}/3`
      });

      if (retryCount < 2) {
        await redisClient.set(retryKey, String(retryCount + 1), { EX: 86400 }); // TTL 1 day

        // Queue retry call in 10 minutes (600 seconds)
        await callQueue.add(
          { leadId: call.leadId, organizationId: call.organizationId },
          { delay: 600 * 1000 }
        );

        // Queue missed call WhatsApp template notification
        await whatsappQueue.add({
          organizationId: call.organizationId,
          leadId: call.leadId,
          phone: call.lead.phone,
          templateName: 'call_missed',
          variables: [call.lead.name],
        });

        logger.info(`Scheduled retry call and queued missed call WhatsApp for lead ${call.lead.name}`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error in Exotel Call status callback:', error.message);
    res.sendStatus(500);
  }
});

// Async Post-Call GPT-4o analysis and lead scoring
const processPostCall = async (callId) => {
  logger.info(`Starting async post-call analysis for Call ID ${callId}`);
  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true, organization: true },
    });

    if (!call) return;

    // Load final conversation history from Redis state
    const stateStr = await redisClient.get(`call:${callId}:state`);
    let rawTranscript = '';
    if (stateStr) {
      const state = JSON.parse(stateStr);
      rawTranscript = (state.transcript || [])
        .map((t) => `${t.speaker.toUpperCase()}: ${t.text}`)
        .join('\n');
      
      // Update Call transcript JSON field
      await prisma.call.update({
        where: { id: callId },
        data: { transcript: state.transcript },
      });
    }

    const analysis = await resolvePostCallAnalysis({
      rawTranscript,
      openaiApiKey: openaiConfig.apiKey,
      callOpenAi: async (transcript) => {
        const prompt = `Analyze this speed-to-lead qualification transcript. Extract qualification details and score the lead from 0 to 100. Return ONLY valid JSON matching this schema:
        {
          "budget": "string or null representing the lead's budget",
          "timeline": "string or null representing timeline",
          "requirement": "string or null representing details",
          "location": "string or null",
          "decisionMaker": true/false/null representing if they are the direct buyer/decision maker,
          "score": number,
          "scoreLabel": "HOT" or "WARM" or "COLD",
          "scoreReason": "detailed explanation of why this score was assigned",
          "summary": "2 sentence summary of the conversation"
        }
        Transcript:\n${transcript}`;

        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              Authorization: `Bearer ${openaiConfig.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return response.data?.choices?.[0]?.message?.content;
      },
    });

    const isScored = ['HOT', 'WARM', 'COLD'].includes(analysis.scoreLabel);
    const isQualified = analysis.scoreLabel === 'HOT' || analysis.scoreLabel === 'WARM';

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: call.leadId },
        data: {
          budget: analysis.budget || call.lead.budget,
          timeline: analysis.timeline || call.lead.timeline,
          requirement: analysis.requirement || call.lead.requirement,
          location: analysis.location || call.lead.location,
          decisionMaker: analysis.decisionMaker ?? call.lead.decisionMaker,
          score: analysis.score,
          scoreLabel: isScored ? analysis.scoreLabel : 'NEEDS_REVIEW',
          scoreReason: analysis.scoreReason,
          isQualified: isScored ? isQualified : false,
          status: isScored ? (isQualified ? 'QUALIFIED' : 'CONTACTED') : 'CONTACTED',
          scoredAt: isScored ? new Date() : null,
        },
      }),
      prisma.call.update({
        where: { id: callId },
        data: {
          summary: analysis.summary,
          extractedData: analysis,
          aiScore: analysis.score,
          aiScoreLabel: isScored ? analysis.scoreLabel : 'NEEDS_REVIEW',
          aiScoreReason: analysis.scoreReason,
          status: analysis.needsManualReview ? 'NEEDS_REVIEW' : 'COMPLETED',
          needsManualReview: Boolean(analysis.needsManualReview),
        },
      }),
      // 4. Activity entry
      prisma.activity.create({
        data: {
          organizationId: call.organizationId,
          leadId: call.leadId,
          type: 'call',
          description: analysis.needsManualReview
            ? `AI outbound call complete — manual review required: ${analysis.scoreReason}`
            : `AI outbound call complete. Qualification: ${analysis.scoreLabel} (${analysis.score}/100)`,
          metadata: analysis,
        },
      }),
    ]);

    await UsageService.incrementUsage(call.organizationId, 'ai_calls', 1);

    emitToOrg(call.organizationId, 'call:completed', {
      callId,
      leadId: call.leadId,
      score: analysis.score,
      scoreLabel: analysis.scoreLabel,
      summary: analysis.summary,
    });

    // 6. Trigger custom workflow automation engine if present
    const automationService = require('../automation/automation.service');
    if (automationService && typeof automationService.triggerAutomations === 'function') {
      await automationService.triggerAutomations(
        'call_completed',
        call.leadId,
        call.organizationId,
        { score: analysis.score, scoreLabel: analysis.scoreLabel }
      );
      if (isScored) {
        await automationService.triggerAutomations(
          'score_updated',
          call.leadId,
          call.organizationId,
          { score: analysis.score, scoreLabel: analysis.scoreLabel }
        );
      }
    }

    // 7. Send post-call summary email and follow-up templates
    await emailQueue.add({
      to: call.organization.users?.[0]?.email || 'sales@leadflowai.com', // default or owner email
      template: 'call_summary',
      variables: {
        leadName: call.lead.name,
        leadPhone: call.lead.phone,
        status: 'COMPLETED',
        score: analysis.score,
        summary: analysis.summary
      }
    });

    // If hot lead, queue proposal template
    if (isScored && analysis.scoreLabel === 'HOT') {
      await whatsappQueue.add({
        organizationId: call.organizationId,
        leadId: call.leadId,
        phone: call.lead.phone,
        templateName: 'proposal_sent',
        variables: [call.lead.name],
      });
    }

    // Clean up cache states
    await redisClient.del(`call:${callId}:state`);
    logger.info(`Outbound AI Call analysis processing completed for Call ID ${callId}`);
  } catch (error) {
    logger.error('Error during async post call processing:', error.message);
  }
};

module.exports = router;
module.exports.processPostCall = processPostCall;
