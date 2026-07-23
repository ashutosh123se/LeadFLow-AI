const axios = require('axios');
const callQueue = require('../callQueue');
const { prisma } = require('../../config/db');
const exotelConfig = require('../../config/exotel');
const sarvamConfig = require('../../config/sarvam');
const logger = require('../../utils/logger');
const { emitToOrg } = require('../../config/socket');
const redisClient = require('../../config/redisClient');

callQueue.process(async (job) => {
  const { leadId, organizationId } = job.data;
  logger.info(`Processing outbound AI call for lead ${leadId} in org ${organizationId}`);

  try {
    // 1. Fetch Lead + Organization
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
      },
    });

    if (!lead) {
      logger.warn(`Lead ${leadId} not found in organization ${organizationId}. Aborting.`);
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      logger.warn(`Organization ${organizationId} not found. Aborting.`);
      return;
    }

    // 2. Pre-call checks
    if (!org.aiCallerEnabled) {
      logger.warn(`AI Caller disabled for organization ${org.name}. Aborting.`);
      return;
    }

    if (!lead.consentGiven) {
      logger.warn(`Lead ${lead.name} has not given consent. Aborting.`);
      return;
    }

    if (org.aiCallsUsed >= org.aiCallsLimit) {
      logger.warn(`AI Caller limit reached for organization ${org.name} (${org.aiCallsUsed}/${org.aiCallsLimit}). Aborting.`);
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const cleanPhoneTenDigit = cleanPhone.slice(-10);
    const isIndianPhone = phoneRegex.test(cleanPhoneTenDigit);

    if (!isIndianPhone) {
      logger.warn(`Invalid 10-digit Indian phone number: ${lead.phone}. Aborting.`);
      return;
    }

    // Check IST hours (UTC + 5:30)
    const nowUtc = new Date();
    const istTimeMs = nowUtc.getTime() + (5.5 * 60 * 60 * 1000);
    const nowIst = new Date(istTimeMs);
    const hours = String(nowIst.getUTCHours()).padStart(2, '0');
    const minutes = String(nowIst.getUTCMinutes()).padStart(2, '0');
    const currentIstTime = `${hours}:${minutes}`;

    const start = org.callingHoursStart || '09:00';
    const end = org.callingHoursEnd || '20:00';

    if (currentIstTime < start || currentIstTime > end) {
      logger.warn(`Current IST time ${currentIstTime} is outside calling hours ${start} - ${end} for lead ${lead.name}. Aborting.`);
      return;
    }

    // 3. Build Greeting Text
    const lang = (org.aiCallerLanguage || 'hindi').toLowerCase();
    let greetingText = '';
    if (lang === 'hindi') {
      greetingText = `Namaste ${lead.name} ji, main LeadFlow-AI ki taraf se ${org.name} ke liye call kar raha hoon. Kya aap abhi do minute de sakte hain?`;
    } else if (lang === 'hinglish') {
      greetingText = `Namaste ${lead.name} ji, main LeadFlow-AI ki taraf se ${org.name} ke liye call kar raha hoon. Kya aapke paas do minute hain baat karne ke liye?`;
    } else {
      greetingText = `Hello ${lead.name}, I am calling on behalf of ${org.name} through LeadFlow-AI. Do you have two minutes?`;
    }

    // 4. Create Call Record (pre-init)
    const call = await prisma.call.create({
      data: {
        organizationId,
        leadId,
        direction: 'OUTBOUND',
        fromNumber: org.exotelCallerId || exotelConfig.callerId || 'LeadFlow-AI',
        toNumber: lead.phone,
        status: 'INITIATED',
        language: org.aiCallerLanguage || 'hindi',
      },
    });

    // 5. Convert Greeting to Speech via Sarvam AI
    const sarvamApiKey = sarvamConfig.apiKey;
    if (!sarvamApiKey) {
      throw new Error('SARVAM_API_KEY is not configured.');
    }
    const speaker = org.aiCallerVoice || 'meera';
    const targetLangCode = lang === 'english' ? 'en-IN' : 'hi-IN';

    let audioBase64 = null;
    try {
      const sarvamRes = await axios.post('https://api.sarvam.ai/text-to-speech', {
        inputs: [greetingText],
        target_language_code: targetLangCode,
        speaker: speaker,
        model: 'bulbul:v1'
      }, {
        headers: {
          'api-subscription-key': sarvamApiKey,
          'Content-Type': 'application/json'
        }
      });
      audioBase64 = sarvamRes.data?.audios?.[0];
    } catch (err) {
      logger.error('Failed to convert greeting to audio via Sarvam AI', err.message);
      // Fail call record
      await prisma.call.update({
        where: { id: call.id },
        data: { status: 'FAILED' }
      });
      emitToOrg(organizationId, 'call:failed', {
        leadId,
        leadName: lead.name,
        phone: lead.phone,
        reason: 'Sarvam AI TTS synthesis failed.'
      });
      return;
    }

    if (!audioBase64) {
      logger.error('Sarvam AI did not return audio data');
      await prisma.call.update({
        where: { id: call.id },
        data: { status: 'FAILED' }
      });
      emitToOrg(organizationId, 'call:failed', {
        leadId,
        leadName: lead.name,
        phone: lead.phone,
        reason: 'Empty audio buffer returned from TTS.'
      });
      return;
    }

    // Save audio base64 in Redis cache with 5 minutes TTL
    await redisClient.set(`call:${call.id}:greeting`, audioBase64, {
      EX: 300
    });

    // 6. Initiate Exotel outbound call
    const exotelSid = org.exotelApiKey || exotelConfig.apiKey;
    const exotelToken = org.exotelApiToken || exotelConfig.apiToken;
    const exotelSub = org.exotelSubdomain || exotelConfig.subdomain;
    const virtualNumber = org.exotelCallerId || exotelConfig.callerId;

    if (!exotelSid || !exotelToken || !exotelSub || !virtualNumber) {
      throw new Error('Exotel credentials are not configured.');
    }

    const exotelUrl = `https://api.exotel.com/v1/Accounts/${exotelSid}/Calls/connect.json`;
    const basicAuth = Buffer.from(`${exotelSid}:${exotelToken}`).toString('base64');
    const apiDomain = process.env.API_DOMAIN || 'https://api.leadflowai.com';
    const twimlUrl = `${apiDomain}/api/v1/webhooks/exotel/twiml/${call.id}`;
    const statusCallbackUrl = `${apiDomain}/api/v1/webhooks/exotel/status/${call.id}`;

    const params = new URLSearchParams();
    params.append('From', lead.phone);
    params.append('CallerId', virtualNumber);
    params.append('Url', twimlUrl);
    params.append('StatusCallback', statusCallbackUrl);
    params.append('StatusCallbackEvents[]', 'terminal');
    params.append('TimeLimit', '300');
    params.append('TimeOut', '30');

    let exotelResponse;
    try {
      exotelResponse = await axios.post(exotelUrl, params, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    } catch (exotelErr) {
      logger.error('Failed to trigger Exotel outbound call API', exotelErr.message);
      await prisma.call.update({
        where: { id: call.id },
        data: { status: 'FAILED' }
      });
      emitToOrg(organizationId, 'call:failed', {
        leadId,
        leadName: lead.name,
        phone: lead.phone,
        reason: 'Exotel API connection failed.'
      });
      return;
    }

    const exotelCallSid = exotelResponse.data?.Call?.Sid;
    if (!exotelCallSid) {
      throw new Error(`Exotel outbound connect did not return Call Sid. Response: ${JSON.stringify(exotelResponse.data)}`);
    }

    // 7. Update DB Call & Lead Status
    await prisma.call.update({
      where: { id: call.id },
      data: { exotelCallSid }
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'CONTACTED',
        lastContactedAt: new Date()
      }
    });

    // 8. Emit live socket events
    emitToOrg(organizationId, 'call:initiated', {
      leadId,
      leadName: lead.name,
      phone: lead.phone,
      callId: call.id,
      exotelCallSid
    });

    logger.info(`Outbound AI call scheduled via Exotel. Sid: ${exotelCallSid}`);
  } catch (error) {
    logger.error(`Error in callWorker processing leadId ${leadId}:`, error.message);
    emitToOrg(organizationId, 'call:failed', {
      leadId,
      reason: error.message
    });
  }
});
