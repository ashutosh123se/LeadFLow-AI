const express = require('express');
const router = express.Router();
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');

// POST or GET /api/v1/webhooks/indiamart/:token
const handleIndiaMartWebhook = async (req, res) => {
  const { token } = req.params;
  const payload = { ...req.query, ...req.body };
  logger.info(`Received IndiaMART lead payload. Token: ${token}, Payload: ${JSON.stringify(payload)}`);

  try {
    // 1. Resolve organization by integration token
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'indiamart',
        webhookUrl: { contains: token },
      },
      include: { organization: true },
    });

    if (!integration || !integration.organization) {
      logger.warn(`No active IndiaMART integration found for token: ${token}`);
      return res.status(404).json({ error: 'Integration token invalid.' });
    }

    const org = integration.organization;

    // 2. Extract Lead Data (Map IndiaMART standard fields)
    const phone = payload.SENDER_MOBILE || payload.sender_mobile || payload.mobile || payload.phone;
    if (!phone) {
      logger.warn('IndiaMART webhook missing sender mobile phone number.');
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const name = payload.SENDER_NAME || payload.sender_name || payload.name || `IndiaMART Lead (${phone})`;
    const email = payload.SENDER_EMAIL || payload.sender_email || payload.email || null;
    const company = payload.SENDER_COMPANY || payload.sender_company || payload.company || null;
    const requirement = payload.QUERY_MESSAGE || payload.query_message || payload.requirement || payload.query || null;

    // 3. Find default pipeline stage
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { organizationId: org.id, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    const stageId = defaultPipeline?.stages?.[0]?.id || null;

    // Check if lead already exists in org
    let lead = await prisma.lead.findFirst({
      where: {
        phone: { contains: phone.slice(-10) },
        organizationId: org.id,
      },
    });

    let isNewLead = false;
    if (!lead) {
      isNewLead = true;
      lead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          stageId,
          name,
          phone,
          email,
          company,
          source: 'INDIAMART',
          requirement,
          consentGiven: true,
          consentAt: new Date(),
        },
      });

      await prisma.activity.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          type: 'system',
          description: 'New lead captured from IndiaMART integration.',
          metadata: payload,
        },
      });
    } else {
      // Update existing lead requirement
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          requirement: requirement || lead.requirement,
          lastContactedAt: new Date(),
        },
      });
    }

    // 4. Emit live update
    emitToOrg(org.id, 'lead:created', {
      leadId: lead.id,
      name: lead.name,
      source: 'INDIAMART',
    });

    // 5. Trigger speed-to-lead AI Caller
    if (isNewLead && org.aiCallerEnabled && org.aiCallsUsed < org.aiCallsLimit) {
      await callQueue.add({
        leadId: lead.id,
        organizationId: org.id,
      });
      logger.info(`Speed-to-lead outbound dialer triggered for IndiaMART lead ${lead.id}`);
    }

    // Trigger workflow automations
    const automationService = require('../automation/automation.service');
    if (automationService && typeof automationService.triggerAutomations === 'function') {
      await automationService.triggerAutomations(
        'new_lead_created',
        lead.id,
        org.id,
        { source: 'INDIAMART' }
      );
    }

    return res.status(200).json({ success: true, leadId: lead.id });
  } catch (error) {
    logger.error('Error handling IndiaMART webhook:', error.message);
    return res.status(500).json({ error: 'Internal webhook error.' });
  }
};

router.post('/:token', handleIndiaMartWebhook);
router.get('/:token', handleIndiaMartWebhook);

module.exports = router;
