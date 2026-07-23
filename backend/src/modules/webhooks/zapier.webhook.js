const express = require('express');
const router = express.Router();
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');
const verifyIntegrationWebhook = require('../../middleware/verifyIntegrationWebhook');

router.post('/:token', verifyIntegrationWebhook('zapier'), async (req, res) => {
  const org = req.organization;
  const payload = req.body;

  try {
    const phone = payload.phone || payload.mobile || payload.Phone || payload.Mobile || payload.phoneNumber;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const name = payload.name || payload.Name || payload.fullName || payload.contactName || `Zapier Lead (${phone})`;
    const email = payload.email || payload.Email || null;
    const company = payload.company || payload.Company || null;
    const requirement = payload.requirement || payload.notes || payload.message || payload.query || null;
    const budget = payload.budget || payload.Budget || null;

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
          source: 'API',
          requirement,
          budget,
          consentGiven: true,
          consentAt: new Date(),
        },
      });

      await prisma.activity.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          type: 'system',
          description: 'New lead imported via Zapier integration.',
          metadata: payload,
        },
      });
    } else {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          requirement: requirement || lead.requirement,
          budget: budget || lead.budget,
          lastContactedAt: new Date(),
        },
      });
    }

    emitToOrg(org.id, 'lead:created', {
      leadId: lead.id,
      name: lead.name,
      source: 'API',
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
      source: 'API',
    });

    return res.status(200).json({ success: true, leadId: lead.id });
  } catch (error) {
    logger.error('Error handling Zapier webhook:', error.message);
    return res.status(500).json({ error: 'Internal webhook processing error.' });
  }
});

module.exports = router;
