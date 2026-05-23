const express = require('express');
const router = express.Router();
const axios = require('axios');
const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');

// GET /api/v1/webhooks/facebook/:token (Verification check from Facebook)
router.get('/:token', (req, res) => {
  const { token } = req.params;
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info(`Facebook Lead Ads verification request. Token URL: ${token}`);

  if (mode && verifyToken) {
    if (mode === 'subscribe' && verifyToken === token) {
      logger.info('Facebook Lead Ads webhook verified successfully.');
      return res.status(200).send(challenge);
    }
  }
  return res.status(403).send('Verification failed');
});

// POST /api/v1/webhooks/facebook/:token (Webhook Lead Event)
router.post('/:token', async (req, res) => {
  const { token } = req.params;
  const body = req.body;
  logger.info(`Received Facebook Lead Ads webhook POST. Token: ${token}, Body: ${JSON.stringify(body)}`);

  // Respond to Facebook immediately
  res.sendStatus(200);

  // Process asynchronously in background
  (async () => {
    try {
      // 1. Resolve organization by integration token
      const integration = await prisma.integration.findFirst({
        where: {
          type: 'facebook',
          webhookUrl: { contains: token },
        },
        include: { organization: true },
      });

      if (!integration || !integration.organization) {
        logger.warn(`No active Facebook integration found for token: ${token}`);
        return;
      }

      const org = integration.organization;

      // 2. Parse LeadGen ID from Facebook webhook change structure
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const leadgenId = value?.leadgen_id || body.leadgen_id;

      if (!leadgenId) {
        logger.warn('Facebook webhook change event did not contain a leadgen_id.');
        return;
      }

      // 3. Retrieve Page Access Token from Integration configuration
      let pageAccessToken = integration.config?.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

      if (!pageAccessToken) {
        logger.warn(`Facebook Page Access Token not configured for org ${org.id}. Ingesting mock data in development.`);
      }

      // 4. Fetch lead details from Facebook Graph API
      let leadData = {
        name: `FB Lead (${leadgenId})`,
        phone: null,
        email: null,
        requirement: null
      };

      if (pageAccessToken) {
        try {
          const fbGraphUrl = `https://graph.facebook.com/v18.0/${leadgenId}`;
          const response = await axios.get(fbGraphUrl, {
            params: { access_token: pageAccessToken }
          });

          const fieldData = response.data?.field_data || [];
          fieldData.forEach((field) => {
            const name = field.name;
            const values = field.values || [];
            const val = values[0];

            if (name === 'full_name' || name === 'name') {
              leadData.name = val;
            } else if (name === 'phone_number' || name === 'phone') {
              leadData.phone = val;
            } else if (name === 'email') {
              leadData.email = val;
            } else {
              leadData.requirement = `${leadData.requirement || ''} | ${name}: ${val}`.trim();
            }
          });
        } catch (err) {
          logger.error(`Failed to fetch lead details from Meta Graph API (leadgen_id: ${leadgenId}):`, err.response?.data || err.message);
          // Standard dev-fallback mock lead if Graph API query fails
          leadData.phone = body.phone || '9999999999';
          leadData.name = body.name || `Facebook Lead (${leadgenId})`;
          leadData.email = body.email || 'facebook-lead@example.com';
        }
      } else {
        // Fallback mock payload in local dev/testing
        leadData.phone = body.phone || '9999999999';
        leadData.name = body.name || `Facebook Lead (${leadgenId})`;
        leadData.email = body.email || 'facebook-lead@example.com';
      }

      if (!leadData.phone) {
        logger.warn('Meta Graph Lead Ads payload returned no phone number. Aborting ingestion.');
        return;
      }

      // 5. Ingest lead into CRM database
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
      } else {
        lead = await prisma.lead.update({
          where: { id: lead.id },
          data: {
            requirement: leadData.requirement || lead.requirement,
            lastContactedAt: new Date(),
          },
        });
      }

      // 6. Socket update
      emitToOrg(org.id, 'lead:created', {
        leadId: lead.id,
        name: lead.name,
        source: 'FACEBOOK_AD',
      });

      // 7. Queue AI Outbound call
      if (isNewLead && org.aiCallerEnabled && org.aiCallsUsed < org.aiCallsLimit) {
        await callQueue.add({
          leadId: lead.id,
          organizationId: org.id,
        });
        logger.info(`Speed-to-lead outbound dialer triggered for Facebook lead ${lead.id}`);
      }

      // Trigger workflow automations
      const automationService = require('../automation/automation.service');
      if (automationService && typeof automationService.triggerAutomations === 'function') {
        await automationService.triggerAutomations(
          'new_lead_created',
          lead.id,
          org.id,
          { source: 'FACEBOOK_AD' }
        );
      }
    } catch (asyncErr) {
      logger.error('Error processing Facebook webhook asynchronously:', asyncErr.message);
    }
  })();
});

module.exports = router;
