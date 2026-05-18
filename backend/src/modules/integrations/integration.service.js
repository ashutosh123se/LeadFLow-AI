const crypto = require('crypto');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

class IntegrationService {
  static async getIntegrations(orgId) {
    const list = await prisma.integration.findMany({
      where: { organizationId: orgId },
    });

    const activeTypes = list.map((i) => i.type);

    // Return full catalog indicating which ones are connected
    const catalog = [
      {
        type: 'indiamart',
        name: 'IndiaMART',
        description: 'Sync your B2B marketplace enquiries into CRM automatically.',
        connected: activeTypes.includes('indiamart'),
        config: list.find((i) => i.type === 'indiamart')?.config || null,
        webhookUrl: list.find((i) => i.type === 'indiamart')?.webhookUrl || null,
      },
      {
        type: 'justdial',
        name: 'Justdial',
        description: 'Push incoming Justdial local business leads instantly.',
        connected: activeTypes.includes('justdial'),
        config: list.find((i) => i.type === 'justdial')?.config || null,
        webhookUrl: list.find((i) => i.type === 'justdial')?.webhookUrl || null,
      },
      {
        type: 'facebook',
        name: 'Facebook Lead Ads',
        description: 'Map form fields from Facebook/Instagram ad lead forms.',
        connected: activeTypes.includes('facebook'),
        config: list.find((i) => i.type === 'facebook')?.config || null,
        webhookUrl: list.find((i) => i.type === 'facebook')?.webhookUrl || null,
      },
      {
        type: 'zapier',
        name: 'Zapier Webhook',
        description: 'Push custom leads to CRM from 5000+ apps.',
        connected: activeTypes.includes('zapier'),
        config: list.find((i) => i.type === 'zapier')?.config || null,
        webhookUrl: list.find((i) => i.type === 'zapier')?.webhookUrl || null,
      },
    ];

    return catalog;
  }

  static async connect(orgId, type, config) {
    // Generate a unique webhook/org token for capture
    const token = crypto.randomBytes(16).toString('hex');
    const webhookUrl = `https://api.leadflowai.com/api/v1/webhooks/${type}/${token}`;

    const integration = await prisma.integration.upsert({
      where: {
        // We want custom compound unique indices but wait, let's query first
        id: (await prisma.integration.findFirst({ where: { organizationId: orgId, type } }))?.id || 'new-id',
      },
      create: {
        organizationId: orgId,
        type,
        config: config || {},
        webhookUrl,
        isActive: true,
      },
      update: {
        config: config || {},
        isActive: true,
      },
    });

    return integration;
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
