const axios = require('axios');
const callQueue = require('../callQueue');
const { prisma } = require('../../config/db');
const exotelConfig = require('../../config/exotel');
const logger = require('../../utils/logger');
const { emitToOrg } = require('../../config/socket');
const { encrypt } = require('../../utils/encryption');

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
      throw new Error(`Lead ${leadId} not found in organization ${organizationId}`);
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    // Double check constraints (AI enabled, plan limits, valid Indian number)
    if (!org.aiCallerEnabled) {
      logger.warn(`AI Caller disabled for organization ${org.name}. Aborting call.`);
      return;
    }

    if (org.aiCallsUsed >= org.aiCallsLimit) {
      logger.warn(`AI Caller limit reached for organization ${org.name} (${org.aiCallsUsed}/${org.aiCallsLimit}). Aborting call.`);
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const isIndianPhone = phoneRegex.test(cleanPhone.slice(-10));

    if (!isIndianPhone) {
      logger.warn(`Invalid Indian phone number: ${lead.phone}. Aborting call.`);
      return;
    }

    // 2. Create the Call record in Database
    const call = await prisma.call.create({
      data: {
        organizationId,
        leadId,
        direction: 'OUTBOUND',
        fromNumber: org.exotelCallerId || exotelConfig.callerId || 'LeadLFlowAI',
        toNumber: lead.phone,
        status: 'INITIATED',
        language: org.aiCallerLanguage || 'hindi',
      },
    });

    // 3. Initiate the Outbound Call via Exotel API
    const exotelSid = org.exotelApiKey || exotelConfig.apiKey;
    const exotelToken = org.exotelApiToken || exotelConfig.apiToken;
    const exotelSub = org.exotelSubdomain || exotelConfig.subdomain;
    const virtualNumber = org.exotelCallerId || exotelConfig.callerId;

    if (!exotelSid || !exotelToken || !exotelSub || !virtualNumber) {
      throw new Error('Exotel credentials are not properly configured.');
    }

    const exotelUrl = `https://api.exotel.com/v1/Accounts/${exotelSid}/Calls/connect.json`;
    const basicAuth = Buffer.from(`${exotelSid}:${exotelToken}`).toString('base64');

    // Callback URLs
    const twimlUrl = `https://api.leadflowai.com/api/v1/webhooks/exotel/twiml/${call.id}`;
    const statusCallbackUrl = `https://api.leadflowai.com/api/v1/webhooks/exotel/status/${call.id}`;

    logger.info(`Sending call request to Exotel: virtualNumber=${virtualNumber}, leadPhone=${lead.phone}`);

    // Exotel call parameters
    const params = new URLSearchParams();
    params.append('From', lead.phone); // Lead phone (Exotel calls this first or second depending on flow, but connect connects callerId to From)
    params.append('CallerId', virtualNumber);
    params.append('Url', twimlUrl);
    params.append('StatusCallback', statusCallbackUrl);
    params.append('StatusCallbackEvents[]', 'terminal');

    const response = await axios.post(exotelUrl, params, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const exotelCallSid = response.data?.Call?.Sid;

    if (!exotelCallSid) {
      throw new Error(`Exotel failed to return Call Sid. Response: ${JSON.stringify(response.data)}`);
    }

    // 4. Update Call record with Exotel Call SID
    await prisma.call.update({
      where: { id: call.id },
      data: {
        exotelCallSid,
      },
    });

    // 5. Emit socket to organization room
    emitToOrg(organizationId, 'call:initiated', {
      callId: call.id,
      leadId,
      leadName: lead.name,
      phone: lead.phone,
      status: 'INITIATED',
    });

    logger.info(`Outbound AI call initiated. Exotel SID: ${exotelCallSid}`);
  } catch (error) {
    logger.error(`Error in callWorker processing lead ${leadId}:`, error);
    // Emit call:failed socket
    emitToOrg(organizationId, 'call:failed', {
      leadId,
      reason: error.message,
    });
    throw error;
  }
});
