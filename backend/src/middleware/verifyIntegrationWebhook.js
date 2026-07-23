const { prisma } = require('../config/db');
const { verifyHmacSha256 } = require('../utils/webhookSignature');
const logger = require('../utils/logger');

/**
 * Resolves integration by URL token and verifies X-LeadFlow-Signature using per-integration webhookSecret.
 */
const verifyIntegrationWebhook = (integrationType) => async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).send('Integration token is required.');
  }

  const integration = await prisma.integration.findFirst({
    where: {
      type: integrationType,
      isActive: true,
      webhookUrl: { endsWith: `/${token}` },
    },
    include: { organization: true },
  });

  if (!integration || !integration.organization) {
    logger.warn(`Unknown ${integrationType} integration token: ${token}`);
    return res.status(404).send('Integration not found.');
  }

  const secret = integration.config?.webhookSecret;
  const result = verifyHmacSha256(req, secret, 'x-leadflow-signature');
  if (!result.ok) {
    logger.warn(`${integrationType} webhook rejected for org ${integration.organizationId}: ${result.message}`);
    return res.status(result.status).send(result.message);
  }

  req.integration = integration;
  req.organizationId = integration.organizationId;
  req.organization = integration.organization;
  return next();
};

module.exports = verifyIntegrationWebhook;
