const express = require('express');
const router = express.Router();
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');
const verifyIntegrationWebhook = require('../../middleware/verifyIntegrationWebhook');

const handleIndiaMartWebhook = async (req, res) => {
  const org = req.organization;
  const payload = { ...req.query, ...req.body };
  logger.info(`Received IndiaMART lead payload for org ${org.id}`);

  try {
    const phone = payload.SENDER_MOBILE || payload.sender_mobile || payload.mobile || payload.phone;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const name = payload.SENDER_NAME || payload.sender_name || payload.name || `IndiaMART Lead (${phone})`;
    const email = payload.SENDER_EMAIL || payload.sender_email || payload.email || null;
    const company = payload.SENDER_COMPANY || payload.sender_company || payload.company || null;
    const requirement = payload.QUERY_MESSAGE || payload.query_message || payload.requirement || payload.query || null;

    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { organizationId: org.id, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    const stageId = defaultPipeline?.stages?.[0]?.id || null;

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
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          requirement: requirement || lead.requirement,
          lastContactedAt: new Date(),
        },
      });
    }

    emitToOrg(org.id, 'lead:created', {
      leadId: lead.id,
      name: lead.name,
      source: 'INDIAMART',
    });

    if (isNewLead && org.aiCallerEnabled) {
      const UsageService = require('../billing/usage.service');
      const usage = await UsageService.checkUsage(org.id, 'ai_calls', false);
      if (usage.allowed) {
        await callQueue.add({ leadId: lead.id, organizationId: org.id });
      }
    }

    const automationService = require('../automation/automation.service');
    await automationService.triggerAutomations('new_lead_created', lead.id, org.id, {
      source: 'INDIAMART',
    });

    return res.status(200).json({ success: true, leadId: lead.id });
  } catch (error) {
    logger.error('Error handling IndiaMART webhook:', error.message);
    return res.status(500).json({ error: 'Internal webhook error.' });
  }
};

router.post('/:token', verifyIntegrationWebhook('indiamart'), handleIndiaMartWebhook);

module.exports = router;
