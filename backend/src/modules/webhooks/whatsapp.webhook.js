const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { prisma } = require('../../config/db');
const whatsappConfig = require('../../config/whatsapp');
const logger = require('../../utils/logger');
const { emitToOrg } = require('../../config/socket');
const callQueue = require('../../queues/callQueue');

// Middleware to verify Meta Webhook Signature using WHATSAPP_APP_SECRET
const verifyMetaSignature = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!signature) {
    logger.warn('WhatsApp webhook missing X-Hub-Signature-256');
    // In local non-production, continue with a warning
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).send('Signature missing');
    }
    return next();
  }

  if (!appSecret) {
    logger.warn('WHATSAPP_APP_SECRET is not configured. Skipping verification.');
    return next();
  }

  const elements = signature.split('=');
  const signatureHash = elements[1];
  
  // Use rawBody if available
  const payload = req.rawBody ? req.rawBody : JSON.stringify(req.body);
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  if (signatureHash !== expectedHash) {
    logger.error('WhatsApp webhook signature verification failed');
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).send('Signature mismatch');
    }
  }
  next();
};

// 1. Webhook Verification (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const localVerifyToken = whatsappConfig.verifyToken || 'your-custom-verify-token';

  if (mode && token) {
    if (mode === 'subscribe' && token === localVerifyToken) {
      logger.info('WhatsApp webhook successfully verified!');
      return res.status(200).send(challenge);
    } else {
      logger.warn(`WhatsApp webhook verification failed. Token mismatch: expected=${localVerifyToken}, received=${token}`);
      return res.status(403).send('Verification failed');
    }
  }
  res.status(400).send('Bad Request');
});

// Support organization token in path (e.g. custom endpoints)
router.get('/:orgToken', (req, res) => {
  const challenge = req.query['hub.challenge'];
  res.status(200).send(challenge);
});

// 2. Inbound Message Handling (POST)
router.post('/', verifyMetaSignature, async (req, res) => {
  const body = req.body;
  logger.info(`Received WhatsApp event payload: ${JSON.stringify(body)}`);

  // Respond immediately to Meta to avoid timeouts (under 2 seconds)
  res.sendStatus(200);

  // Process the webhook payload asynchronously in the background
  (async () => {
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messageObj = value?.messages?.[0];

      if (!messageObj) {
        // Handle delivery status update (sent, delivered, read, failed)
        const statusObj = value?.statuses?.[0];
        if (statusObj) {
          const waMessageId = statusObj.id;
          const status = statusObj.status; 

          await prisma.whatsappMessage.updateMany({
            where: { waMessageId },
            data: {
              status,
              ...(status === 'delivered' && { deliveredAt: new Date() }),
              ...(status === 'read' && { readAt: new Date() }),
            },
          });
        }
        return;
      }

      const phone = messageObj.from; 
      const waMessageId = messageObj.id;
      const content = messageObj.text?.body || '[Media/Unsupported Message]';
      const metadataPhoneId = value?.metadata?.phone_number_id;

      // Find organization by whatsappPhoneId
      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            { whatsappPhoneId: metadataPhoneId },
            { whatsappPhoneId: { not: null } },
          ],
        },
      });

      if (!org) {
        logger.error(`No organization registered for WhatsApp Phone ID: ${metadataPhoneId}`);
        return;
      }

      // Find or create lead within organization context
      let lead = await prisma.lead.findFirst({
        where: {
          phone: { contains: phone.slice(-10) }, 
          organizationId: org.id,
        },
      });

      let isNewLead = false;
      if (!lead) {
        isNewLead = true;

        // Find default pipeline stage
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

      // Save Inbound Message
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

      // Update lastContactedAt
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContactedAt: new Date() },
      });

      // Emit live WebSocket update
      emitToOrg(org.id, 'whatsapp:received', {
        leadId: lead.id,
        leadName: lead.name,
        message: content,
        timestamp: whatsappMessage.sentAt,
      });

      // Trigger workflow automation engine for "whatsapp_reply_received"
      const automationService = require('../automation/automation.service');
      if (automationService && typeof automationService.triggerAutomations === 'function') {
        await automationService.triggerAutomations(
          'whatsapp_reply_received',
          lead.id,
          org.id,
          { content }
        );
      }

      // If new lead, trigger AI speed-to-lead calling queue
      if (isNewLead && org.aiCallerEnabled && org.aiCallsUsed < org.aiCallsLimit) {
        await callQueue.add({
          leadId: lead.id,
          organizationId: org.id,
        });
        logger.info(`Speed-to-lead dialer triggered for new inbound WhatsApp lead ${lead.id}`);
      }
    } catch (asyncErr) {
      logger.error('Error processing WhatsApp webhook asynchronously:', asyncErr.message);
    }
  })();
});

module.exports = router;
