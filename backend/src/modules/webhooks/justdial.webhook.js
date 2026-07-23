const express = require('express');
const router = express.Router();
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');
const verifyIntegrationWebhook = require('../../middleware/verifyIntegrationWebhook');

const handleJustDialWebhook = async (req, res) => {
  const org = req.organization;
  const payload = { ...req.query, ...req.body };

  try {
    const phone = payload.mobile || payload.phone || payload.SENDER_MOBILE || payload.lead_mobile;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const name = payload.name || payload.lead_name || payload.SENDER_NAME || `Justdial Lead (${phone})`;
    const email = payload.email || payload.lead_email || null;
    const category = payload.category || payload.area || payload.requirement || payload.query || null;

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

    emitToOrg(org.id, 'lead:created', {
      leadId: lead.id,
      name: lead.name,
      source: 'JUSTDIAL',
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
      source: 'JUSTDIAL',
    });

    return res.status(200).json({ success: true, leadId: lead.id });
  } catch (error) {
    logger.error('Error handling Justdial webhook:', error.message);
    return res.status(500).json({ error: 'Internal webhook error.' });
  }
};

router.post('/:token', verifyIntegrationWebhook('justdial'), handleJustDialWebhook);

module.exports = router;
