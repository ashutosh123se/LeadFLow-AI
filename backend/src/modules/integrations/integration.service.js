const crypto = require('crypto');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

class IntegrationService {
  static async getIntegrations(orgId) {
    const list = await prisma.integration.findMany({
      where: { organizationId: orgId },
    });

    const activeTypes = list.map((i) => i.type);
    const apiDomain = process.env.API_DOMAIN || 'http://localhost:5000';

    const catalog = [
      {
        type: 'indiamart',
        name: 'IndiaMART',
        description: 'Sync your B2B marketplace enquiries into CRM automatically.',
        connected: activeTypes.includes('indiamart'),
        config: IntegrationService.sanitizeConfig(list.find((i) => i.type === 'indiamart')?.config),
        webhookUrl: list.find((i) => i.type === 'indiamart')?.webhookUrl || null,
      },
      {
        type: 'justdial',
        name: 'JustDial',
        description: 'Push incoming Justdial local business leads instantly.',
        connected: activeTypes.includes('justdial'),
        config: IntegrationService.sanitizeConfig(list.find((i) => i.type === 'justdial')?.config),
        webhookUrl: list.find((i) => i.type === 'justdial')?.webhookUrl || null,
      },
      {
        type: 'facebook',
        name: 'Facebook Lead Ads',
        description: 'Map form fields from Facebook/Instagram ad lead forms.',
        connected: activeTypes.includes('facebook'),
        config: IntegrationService.sanitizeConfig(list.find((i) => i.type === 'facebook')?.config),
        webhookUrl: list.find((i) => i.type === 'facebook')?.webhookUrl || null,
      },
      {
        type: 'zapier',
        name: 'Zapier Webhook',
        description: 'Push custom leads to CRM from 5000+ apps.',
        connected: activeTypes.includes('zapier'),
        config: IntegrationService.sanitizeConfig(list.find((i) => i.type === 'zapier')?.config),
        webhookUrl: list.find((i) => i.type === 'zapier')?.webhookUrl || null,
      },
    ];

    return catalog.map((item) => ({
      ...item,
      docs: {
        signatureHeader: 'X-LeadFlow-Signature',
        signatureAlgorithm: 'HMAC-SHA256 hex digest of raw JSON body using webhookSecret',
        apiDomain,
      },
    }));
  }

  static sanitizeConfig(config) {
    if (!config) return null;
    const { webhookSecret, ...safe } = config;
    return {
      ...safe,
      hasWebhookSecret: Boolean(webhookSecret),
    };
  }

  static async connect(orgId, type, config) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    const { canConnectIntegration, getUpgradeSuggestion } = require('../billing/planFeatures');
    if (!canConnectIntegration(org, type)) {
      throw new ApiError(
        402,
        `${type} integration requires a higher plan. Upgrade to Growth or above.`,
        { upgrade: getUpgradeSuggestion(org, 'integration') }
      );
    }

    const token = crypto.randomBytes(16).toString('hex');
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const apiDomain = process.env.API_DOMAIN || 'http://localhost:5000';
    const webhookUrl = `${apiDomain}/api/v1/webhooks/${type}/${token}`;

    const existing = await prisma.integration.findFirst({
      where: { organizationId: orgId, type },
    });

    const mergedConfig = {
      ...(existing?.config || {}),
      ...(config || {}),
      webhookSecret,
      verifyToken: config?.verifyToken || crypto.randomBytes(16).toString('hex'),
    };

    const integration = existing
      ? await prisma.integration.update({
          where: { id: existing.id },
          data: {
            config: mergedConfig,
            webhookUrl,
            isActive: true,
          },
        })
      : await prisma.integration.create({
          data: {
            organizationId: orgId,
            type,
            config: mergedConfig,
            webhookUrl,
            isActive: true,
          },
        });

    return {
      ...integration,
      webhookSecret,
      signatureHeader: 'X-LeadFlow-Signature',
    };
  }

  static async disconnect(orgId, type) {
    const integration = await prisma.integration.findFirst({
      where: { organizationId: orgId, type },
    });

    if (!integration) {
      throw new ApiError(404, 'Integration not found.');
    }

    await prisma.integration.delete({
      where: { id: integration.id },
    });

    return true;
  }
}

module.exports = IntegrationService;
