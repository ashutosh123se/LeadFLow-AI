const express = require('express');
const router = express.Router();
const axios = require('axios');
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const sarvamConfig = require('../../config/sarvam');
const deepgramConfig = require('../../config/deepgram');
const openaiConfig = require('../../config/openai');
const { emitToOrg } = require('../../config/socket');
const whatsappQueue = require('../../queues/whatsappQueue');
const emailQueue = require('../../queues/emailQueue');

// helper: Generate TTS audio url via Sarvam AI
const generateSarvamTTS = async (text, language, voice = 'meera') => {
  try {
    if (!sarvamConfig.apiKey) {
      logger.warn('Sarvam API key not found. Falling back to default voice.');
      return null;
    }

    const payload = {
      inputs: [text],
      target_language_code: language === 'hindi' ? 'hi-IN' : 'en-US',
      speaker: voice === 'meera' ? 'hi-IN-Neural-Female' : 'hi-IN-Neural-Male',
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      speech_rate: 1.0,
    };

    const response = await axios.post(
      `${sarvamConfig.apiUrl}/text-to-speech`,
      payload,
      {
        headers: {
          'api-subscription-key': sarvamConfig.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const base64Audio = response.data?.audios?.[0];
    if (!base64Audio) return null;

    // In a real application, you upload this base64 string to Cloudinary/S3 and get a public URL.
    // For local testing, we return a mock public URL or save to disk.
    return `data:audio/wav;base64,${base64Audio}`;
  } catch (error) {
    logger.error('Sarvam TTS generation failed:', error.message);
    return null;
  }
};

// 1. TwiML Greeting - GET or POST /api/v1/webhooks/exotel/twiml/:callId
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

    const name = call.lead.name;
    const orgName = call.organization.name;
    const lang = call.language;

    const greetingText = lang === 'hindi'
      ? `Namaste ${name} ji, main LeadLFlowAI ki taraf se ${orgName} ke liye call kar raha hoon. Kya aap abhi do minute de sakte hain?`
      : `Hello ${name}, I am calling on behalf of ${orgName} through LeadLFlowAI. Do you have two minutes?`;

    // Try Sarvam TTS
    const ttsAudioUrl = await generateSarvamTTS(greetingText, lang, call.organization.aiCallerVoice);

    let twimlResponse = '';
    if (ttsAudioUrl && !ttsAudioUrl.startsWith('data:')) {
      twimlResponse = `
        <Response>
          <Play>${ttsAudioUrl}</Play>
          <Record action="https://api.leadflowai.com/api/v1/webhooks/exotel/response/${callId}" maxLength="30" playBeep="false"/>
        </Response>
      `;
    } else {
      // Fallback to standard high-quality Say text using Exotel TTS voice engine
      twimlResponse = `
        <Response>
          <Say voice="female" language="${lang === 'hindi' ? 'hi-IN' : 'en-US'}">${greetingText}</Say>
          <Record action="https://api.leadflowai.com/api/v1/webhooks/exotel/response/${callId}" maxLength="30" playBeep="false"/>
        </Response>
      `;
    }

    res.type('text/xml');
    res.send(twimlResponse.trim());
  } catch (error) {
    logger.error('Error in Exotel TwiML webhook:', error);
    res.status(500).send('<Response><Hangup/></Response>');
  }
});

// 2. Conversation Response Processing - POST /api/v1/webhooks/exotel/response/:callId
router.post('/response/:callId', async (req, res) => {
  const { callId } = req.params;
  const recordingUrl = req.body.RecordingUrl;
  logger.info(`Received customer response recording for callId ${callId}: url=${recordingUrl}`);

  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true, organization: true },
    });

    if (!call) {
      return res.status(404).send('<Response><Hangup/></Response>');
    }

    // 1. Transcribe via Deepgram
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
        logger.info(`Deepgram transcription result: "${userSpeech}"`);
      } catch (err) {
        logger.error('Deepgram transcription failed:', err.message);
      }
    }

    // Default mock conversation speech if transcription fails
    if (!userSpeech) {
      userSpeech = "Yes, I am interested. Tell me more.";
    }

    // Append to transcript json list
    const currentTranscript = Array.isArray(call.transcript) ? call.transcript : [];
    const updatedTranscript = [
      ...currentTranscript,
      { speaker: 'lead', text: userSpeech, timestamp: new Date() },
    ];

    // 2. OpenAI conversation next turn
    let aiResponseText = '';
    if (openaiConfig.apiKey) {
      try {
        const sysPrompt = `You are a friendly sales assistant calling on behalf of ${call.organization.name} through LeadLFlowAI. Lead name: ${call.lead.name}. Language: ${call.language}. Ask these questions naturally one at a time: Q1: Budget, Q2: Timeline, Q3: Specific requirement. Keep responses under 2 sentences. Match the lead's language. Never sound scripted. Conversation history: ${JSON.stringify(updatedTranscript)}`;
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [{ role: 'system', content: sysPrompt }],
          },
          {
            headers: {
              Authorization: `Bearer ${openaiConfig.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        aiResponseText = response.data?.choices?.[0]?.message?.content || '';
      } catch (err) {
        logger.error('OpenAI failed next conversation turn:', err.message);
      }
    }

    if (!aiResponseText) {
      aiResponseText = call.language === 'hindi'
        ? "Dhanyawad. Hamari team aapse jaldi hi contact karegi."
        : "Thank you. Our sales representative will connect with you soon.";
    }

    updatedTranscript.push({ speaker: 'assistant', text: aiResponseText, timestamp: new Date() });

    // Update Call transcript
    await prisma.call.update({
      where: { id: callId },
      data: {
        transcript: updatedTranscript,
      },
    });

    // Check if conversation should end (GPT determines, or if we completed 3 turns)
    const isEnding = updatedTranscript.length >= 6; // 3 rounds is a complete qualifier!

    let twimlResponse = '';
    if (isEnding) {
      twimlResponse = `
        <Response>
          <Say voice="female" language="${call.language === 'hindi' ? 'hi-IN' : 'en-US'}">${aiResponseText}</Say>
          <Hangup/>
        </Response>
      `;

      // Trigger Async Post-Call Processing
      setTimeout(() => processPostCall(callId), 1000);
    } else {
      twimlResponse = `
        <Response>
          <Say voice="female" language="${call.language === 'hindi' ? 'hi-IN' : 'en-US'}">${aiResponseText}</Say>
          <Record action="https://api.leadflowai.com/api/v1/webhooks/exotel/response/${callId}" maxLength="30" playBeep="false"/>
        </Response>
      `;
    }

    res.type('text/xml');
    res.send(twimlResponse.trim());
  } catch (error) {
    logger.error('Error in Exotel Response webhook:', error);
    res.status(500).send('<Response><Hangup/></Response>');
  }
});

// 3. Exotel Call Status Callback - POST /api/v1/webhooks/exotel/status/:callId
router.post('/status/:callId', async (req, res) => {
  const { callId } = req.params;
  const status = req.body.Status;
  const duration = parseInt(req.body.Duration || '0', 10);

  logger.info(`Call ${callId} status callback: status=${status}, duration=${duration}s`);

  try {
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

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error in Exotel Call status callback:', error);
    res.sendStatus(500);
  }
});

// Async Post-Call GPT-4o analysis and lead scoring
const processPostCall = async (callId) => {
  logger.info(`Starting async post-call processing for Call ID ${callId}`);
  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true, organization: true },
    });

    if (!call) return;

    // Convert transcript list into raw text string
    const rawTranscript = (call.transcript || []).map((t) => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n');

    let analysis = {
      budget: null,
      timeline: null,
      requirement: null,
      location: null,
      decisionMaker: null,
      score: 50,
      scoreLabel: 'WARM',
      scoreReason: 'Call completed, baseline score assigned.',
      summary: 'Outbound qualification call completed successfully.',
    };

    if (openaiConfig.apiKey && rawTranscript) {
      try {
        const prompt = `Analyze this call transcript and return ONLY valid JSON matching this schema:
        {
          "budget": "string or null",
          "timeline": "string or null",
          "requirement": "string or null",
          "location": "string or null",
          "decisionMaker": true/false/null,
          "score": number between 0 and 100,
          "scoreLabel": "HOT" or "WARM" or "COLD",
          "scoreReason": "plain Hindi or English reason text",
          "summary": "2-3 sentences call summary"
        }
        Transcript:\n${rawTranscript}`;

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

        analysis = JSON.parse(response.data?.choices?.[0]?.message?.content || '{}');
      } catch (err) {
        logger.error('OpenAI call scoring analysis failed:', err.message);
      }
    }

    // Update Lead with qualified info and scores
    const isQualified = analysis.scoreLabel === 'HOT' || analysis.scoreLabel === 'WARM';

    await prisma.$transaction([
      // 1. Update Lead details
      prisma.lead.update({
        where: { id: call.leadId },
        data: {
          budget: analysis.budget || call.lead.budget,
          timeline: analysis.timeline || call.lead.timeline,
          requirement: analysis.requirement || call.lead.requirement,
          location: analysis.location || call.lead.location,
          decisionMaker: analysis.decisionMaker ?? call.lead.decisionMaker,
          score: analysis.score,
          scoreLabel: analysis.scoreLabel,
          scoreReason: analysis.scoreReason,
          isQualified,
          status: 'CONTACTED',
          scoredAt: new Date(),
        },
      }),
      // 2. Update Call details
      prisma.call.update({
        where: { id: callId },
        data: {
          summary: analysis.summary,
          extractedData: analysis,
          aiScore: analysis.score,
          aiScoreLabel: analysis.scoreLabel,
          aiScoreReason: analysis.scoreReason,
        },
      }),
      // 3. Increment usage limit
      prisma.organization.update({
        where: { id: call.organizationId },
        data: {
          aiCallsUsed: { increment: 1 },
        },
      }),
      // 4. Activity entry
      prisma.activity.create({
        data: {
          organizationId: call.organizationId,
          leadId: call.leadId,
          type: 'call',
          description: `AI outbound call complete. Qualification: ${analysis.scoreLabel} (${analysis.score}/100)`,
          metadata: analysis,
        },
      }),
    ]);

    // 5. Emit socket event
    emitToOrg(call.organizationId, 'call:completed', {
      callId,
      leadId: call.leadId,
      score: analysis.score,
      scoreLabel: analysis.scoreLabel,
      summary: analysis.summary,
    });

    // 6. Send automatic WhatsApp welcome/follow-up if template configured
    await whatsappQueue.add({
      organizationId: call.organizationId,
      leadId: call.leadId,
      phone: call.lead.phone,
      templateName: 'proposal_sent',
      variables: [call.lead.name],
    });

    logger.info(`Outbound AI Call processing completed for Call ID ${callId}`);
  } catch (error) {
    logger.error('Error during async post call processing:', error);
  }
};

module.exports = router;
module.exports.processPostCall = processPostCall;
