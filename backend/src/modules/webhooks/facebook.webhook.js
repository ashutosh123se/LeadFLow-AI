const express = require('express');
const router = express.Router();
const axios = require('axios');
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');
const verifyIntegrationWebhook = require('../../middleware/verifyIntegrationWebhook');

router.get('/:token', (req, res) => {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  prisma.integration.findFirst({
    where: {
      type: 'facebook',
      isActive: true,
      webhookUrl: { endsWith: `/${req.params.token}` },
    },
  }).then((integration) => {
    const expectedVerifyToken = integration?.config?.verifyToken;
    if (!expectedVerifyToken) {
      return res.status(503).send('Facebook integration is not configured.');
    }
    if (mode === 'subscribe' && verifyToken === expectedVerifyToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }).catch(() => res.status(500).send('Verification error'));
});

router.post('/:token', verifyIntegrationWebhook('facebook'), async (req, res) => {
  const org = req.organization;
  const integration = req.integration;
  const body = req.body;
  res.sendStatus(200);

  (async () => {
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const leadgenId = value?.leadgen_id || body.leadgen_id;

      if (!leadgenId) {
        logger.warn('Facebook webhook change event did not contain a leadgen_id.');
        return;
      }

      const pageAccessToken = integration.config?.pageAccessToken;
      if (!pageAccessToken) {
        logger.error(`Facebook Page Access Token not configured for org ${org.id}.`);
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            config: {
              ...integration.config,
              connectionError: 'Facebook Page Access Token is missing. Reconnect the integration.',
              connected: false,
            },
          },
        });
        return;
      }

      let leadData = {
        name: `FB Lead (${leadgenId})`,
        phone: null,
        email: null,
        requirement: null,
      };

      try {
        const fbGraphUrl = `https://graph.facebook.com/v18.0/${leadgenId}`;
        const response = await axios.get(fbGraphUrl, {
          params: { access_token: pageAccessToken },
        });

        const fieldData = response.data?.field_data || [];
        fieldData.forEach((field) => {
          const val = field.values?.[0];
          if (field.name === 'full_name' || field.name === 'name') leadData.name = val;
          else if (field.name === 'phone_number' || field.name === 'phone') leadData.phone = val;
          else if (field.name === 'email') leadData.email = val;
          else leadData.requirement = `${leadData.requirement || ''} | ${field.name}: ${val}`.trim();
        });
      } catch (err) {
        logger.error(`Failed to fetch lead from Meta Graph API (${leadgenId}):`, err.response?.data || err.message);
        return;
      }

      if (!leadData.phone) {
        logger.warn('Meta Graph Lead Ads payload returned no phone number. Aborting ingestion.');
        return;
      }

      const defaultPipeline = await prisma.pipeline.findFirst({
        where: { organizationId: org.id, isDefault: true },
        include: { stages: { orderBy: { order: 'asc' } } },
      });
      const stageId = defaultPipeline?.stages?.[0]?.id || null;

      let lead = await prisma.lead.findFirst({
        where: {
          phone: { contains: leadData.phone.slice(-10) },
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
            name: leadData.name,
            phone: leadData.phone,
            email: leadData.email,
            source: 'FACEBOOK_AD',
            requirement: leadData.requirement,
            consentGiven: true,
            consentAt: new Date(),
          },
        });

        await prisma.activity.create({
          data: {
            organizationId: org.id,
            leadId: lead.id,
            type: 'system',
            description: `New lead generated from Facebook Lead Ads (leadgen_id: ${leadgenId}).`,
            metadata: { leadgenId, ...leadData },
          },
        });
      }

      emitToOrg(org.id, 'lead:created', {
        leadId: lead.id,
        name: lead.name,
        source: 'FACEBOOK_AD',
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
        source: 'FACEBOOK_AD',
      });
    } catch (asyncErr) {
      logger.error('Error processing Facebook webhook asynchronously:', asyncErr.message);
    }
  })();
});

module.exports = router;
