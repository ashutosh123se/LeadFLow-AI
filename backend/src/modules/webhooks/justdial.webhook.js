const express = require('express');
const router = express.Router();
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');

// POST or GET /api/v1/webhooks/justdial/:token
const handleJustDialWebhook = async (req, res) => {
  const { token } = req.params;
  const payload = { ...req.query, ...req.body };
  logger.info(`Received Justdial lead payload. Token: ${token}, Payload: ${JSON.stringify(payload)}`);

  try {
    // 1. Resolve organization by integration token
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'justdial',
        webhookUrl: { contains: token },
      },
      include: { organization: true },
    });

    if (!integration || !integration.organization) {
      logger.warn(`No active Justdial integration found for token: ${token}`);
      return res.status(404).json({ error: 'Integration token invalid.' });
    }

    const org = integration.organization;

    // 2. Extract Lead Data (Map Justdial standard fields)
    const phone = payload.mobile || payload.phone || payload.SENDER_MOBILE || payload.lead_mobile;
    if (!phone) {
      logger.warn('Justdial webhook missing mobile number.');
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const name = payload.name || payload.lead_name || payload.SENDER_NAME || `Justdial Lead (${phone})`;
    const email = payload.email || payload.lead_email || null;
    const category = payload.category || payload.area || payload.requirement || payload.query || null;

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
          source: 'JUSTDIAL',
          requirement: category,
          consentGiven: true,
          consentAt: new Date(),
        },
      });

      await prisma.activity.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          type: 'system',
          description: 'New lead captured from Justdial integration.',
          metadata: payload,
        },
      });
    } else {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          requirement: category || lead.requirement,
          lastContactedAt: new Date(),
        },
      });
    }

    // 4. Emit live update
    emitToOrg(org.id, 'lead:created', {
      leadId: lead.id,
      name: lead.name,
      source: 'JUSTDIAL',
    });

    // 5. Trigger speed-to-lead AI Caller
    if (isNewLead && org.aiCallerEnabled && org.aiCallsUsed < org.aiCallsLimit) {
      await callQueue.add({
        leadId: lead.id,
        organizationId: org.id,
      });
      logger.info(`Speed-to-lead outbound dialer triggered for Justdial lead ${lead.id}`);
    }

    // Trigger workflow automations
    const automationService = require('../automation/automation.service');
    if (automationService && typeof automationService.triggerAutomations === 'function') {
      await automationService.triggerAutomations(
        'new_lead_created',
        lead.id,
        org.id,
        { source: 'JUSTDIAL' }
      );
    }

    return res.status(200).json({ success: true, leadId: lead.id });
  } catch (error) {
    logger.error('Error handling Justdial webhook:', error.message);
    return res.status(500).json({ error: 'Internal webhook error.' });
  }
};

router.post('/:token', handleJustDialWebhook);
router.get('/:token', handleJustDialWebhook);

module.exports = router;
