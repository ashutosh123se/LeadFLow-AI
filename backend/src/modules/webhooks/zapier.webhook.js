const express = require('express');
const router = express.Router();
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');
const { decrypt } = require('../../utils/encryption');

// POST /api/v1/webhooks/zapier/:token
router.post('/:token', async (req, res) => {
  const { token } = req.params;
  const payload = req.body;
  logger.info(`Received Zapier webhook. Token URL: ${token}, Payload: ${JSON.stringify(payload)}`);

  try {
    let org = null;

    // 1. Resolve organization by decrypted body token if present
    if (payload.orgToken) {
      try {
        const decryptedId = decrypt(payload.orgToken);
        if (decryptedId) {
          org = await prisma.organization.findUnique({
            where: { id: decryptedId },
          });
        }
      } catch (decErr) {
        logger.error('Failed to decrypt orgToken in Zapier body:', decErr.message);
      }
    }

    // 2. Fallback: Resolve by integration token from URL
    if (!org && token) {
      const integration = await prisma.integration.findFirst({
        where: {
          type: 'zapier',
          webhookUrl: { contains: token },
        },
        include: { organization: true },
      });
      org = integration?.organization || null;
    }

    if (!org) {
      logger.warn(`No organization resolved for Zapier payload. Token: ${token}`);
      return res.status(401).json({ error: 'Unauthorized. Invalid organization token.' });
    }

    // 3. Extract Lead Fields from flexible Zapier schema
    const phone = payload.phone || payload.mobile || payload.Phone || payload.Mobile || payload.phoneNumber;
    if (!phone) {
      logger.warn('Zapier payload missing phone number.');
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const name = payload.name || payload.Name || payload.fullName || payload.contactName || `Zapier Lead (${phone})`;
    const email = payload.email || payload.Email || null;
    const company = payload.company || payload.Company || null;
    const requirement = payload.requirement || payload.notes || payload.message || payload.query || null;
    const budget = payload.budget || payload.Budget || null;

    // 4. Find default pipeline stage
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { organizationId: org.id, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    const stageId = defaultPipeline?.stages?.[0]?.id || null;

    // Check if lead already exists
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
          source: 'API', // Zapier or external API
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

    // 5. Socket broadcast
    emitToOrg(org.id, 'lead:created', {
      leadId: lead.id,
      name: lead.name,
      source: 'API',
    });

    // 6. Trigger speed-to-lead outbound call
    if (isNewLead && org.aiCallerEnabled && org.aiCallsUsed < org.aiCallsLimit) {
      await callQueue.add({
        leadId: lead.id,
        organizationId: org.id,
      });
      logger.info(`Speed-to-lead outbound dialer triggered for Zapier lead ${lead.id}`);
    }

    // Trigger workflow automations
    const automationService = require('../automation/automation.service');
    if (automationService && typeof automationService.triggerAutomations === 'function') {
      await automationService.triggerAutomations(
        'new_lead_created',
        lead.id,
        org.id,
        { source: 'API' }
      );
    }

    return res.status(200).json({ success: true, leadId: lead.id });
  } catch (error) {
    logger.error('Error handling Zapier webhook:', error.message);
    return res.status(500).json({ error: 'Internal webhook processing error.' });
  }
});

module.exports = router;
