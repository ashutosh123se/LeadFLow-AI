const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { prisma } = require('../../config/db');
const whatsappConfig = require('../../config/whatsapp');
const logger = require('../../utils/logger');
const { emitToOrg } = require('../../config/socket');
const callQueue = require('../../queues/callQueue');
const { verifyHmacSha256 } = require('../../utils/webhookSignature');

const verifyMetaSignature = (req, res, next) => {
  const appSecret = whatsappConfig.appSecret;
  if (!appSecret) {
    logger.error('WHATSAPP_APP_SECRET is not configured.');
    return res.status(500).send('Webhook security is not configured.');
  }

  const result = verifyHmacSha256(req, appSecret, 'x-hub-signature-256');
  if (!result.ok) {
    logger.error(`WhatsApp webhook rejected: ${result.message}`);
    return res.status(result.status).send(result.message);
  }

  return next();
};

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = whatsappConfig.verifyToken;

  if (!verifyToken) {
    return res.status(500).send('WHATSAPP_VERIFY_TOKEN is not configured.');
  }

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('WhatsApp webhook verified successfully.');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook verification failed.');
  return res.status(403).send('Verification failed');
});

router.get('/:orgToken', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = whatsappConfig.verifyToken;

  if (!verifyToken) {
    return res.status(500).send('WHATSAPP_VERIFY_TOKEN is not configured.');
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Verification failed');
});

router.post('/', verifyMetaSignature, async (req, res) => {
  const body = req.body;
  res.sendStatus(200);

  (async () => {
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messageObj = value?.messages?.[0];

      if (!messageObj) {
        const statusObj = value?.statuses?.[0];
        if (statusObj) {
          await prisma.whatsappMessage.updateMany({
            where: { waMessageId: statusObj.id },
            data: {
              status: statusObj.status,
              ...(statusObj.status === 'delivered' && { deliveredAt: new Date() }),
              ...(statusObj.status === 'read' && { readAt: new Date() }),
            },
          });
        }
        return;
      }

      const phone = messageObj.from;
      const waMessageId = messageObj.id;
      const content = messageObj.text?.body || '[Media/Unsupported Message]';
      const metadataPhoneId = value?.metadata?.phone_number_id;

      if (!metadataPhoneId) {
        logger.error('WhatsApp webhook missing phone_number_id metadata.');
        return;
      }

      const org = await prisma.organization.findFirst({
        where: { whatsappPhoneId: metadataPhoneId },
      });

      if (!org) {
        logger.error(`No organization registered for WhatsApp Phone ID: ${metadataPhoneId}`);
        return;
      }

      let lead = await prisma.lead.findFirst({
        where: {
          phone: { contains: phone.slice(-10) },
          organizationId: org.id,
        },
      });

      let isNewLead = false;
      if (!lead) {
        isNewLead = true;
        const defaultPipeline = await prisma.pipeline.findFirst({
          where: { organizationId: org.id, isDefault: true },
          include: { stages: { orderBy: { order: 'asc' } } },
        });
        const stageId = defaultPipeline?.stages?.[0]?.id || null;

        lead = await prisma.lead.create({
          data: {
            organizationId: org.id,
            stageId,
            name: `WhatsApp Lead (${phone})`,
            phone,
            whatsapp: phone,
            source: 'WHATSAPP',
            consentGiven: true,
            consentAt: new Date(),
          },
        });

        await prisma.activity.create({
          data: {
            organizationId: org.id,
            leadId: lead.id,
            type: 'system',
            description: 'New lead generated automatically from inbound WhatsApp message.',
          },
        });
      }

      const whatsappMessage = await prisma.whatsappMessage.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          waMessageId,
          direction: 'INBOUND',
          type: 'text',
          content,
          status: 'received',
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContactedAt: new Date() },
      });

      emitToOrg(org.id, 'whatsapp:received', {
        leadId: lead.id,
        leadName: lead.name,
        message: content,
        timestamp: whatsappMessage.sentAt,
      });

      const automationService = require('../automation/automation.service');
      await automationService.triggerAutomations(
        'whatsapp_reply_received',
        lead.id,
        org.id,
        { content }
      );

      if (isNewLead) {
        await automationService.triggerAutomations(
          'new_lead_created',
          lead.id,
          org.id,
          { source: 'WHATSAPP' }
        );
      }

      if (isNewLead && org.aiCallerEnabled) {
        const UsageService = require('../billing/usage.service');
        const usage = await UsageService.checkUsage(org.id, 'ai_calls', false);
        if (usage.allowed) {
          await callQueue.add({
            leadId: lead.id,
            organizationId: org.id,
          });
        }
      }
    } catch (asyncErr) {
      logger.error('Error processing WhatsApp webhook asynchronously:', asyncErr.message);
    }
  })();
});

module.exports = router;
