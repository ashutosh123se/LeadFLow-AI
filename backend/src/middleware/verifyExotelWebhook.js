const { getEnv } = require('../config/env');
const { verifyHmacSha256 } = require('../utils/webhookSignature');
const logger = require('../utils/logger');

/**
 * Validates Exotel webhook requests using EXOTEL_WEBHOOK_SECRET + HMAC-SHA256.
 * Configure Exotel callback URL to include signature or send X-LeadFlow-Exotel-Signature header.
 */
const verifyExotelWebhook = (req, res, next) => {
  let secret;
  try {
    secret = getEnv('EXOTEL_WEBHOOK_SECRET', { required: true });
  } catch (error) {
    logger.error('Exotel webhook rejected:', error.message);
    return res.status(500).send('Server webhook security is not configured.');
  }

  const result = verifyHmacSha256(req, secret, 'x-leadflow-exotel-signature');
  if (!result.ok) {
    logger.warn(`Exotel webhook rejected: ${result.message}`);
    return res.status(result.status).send(result.message);
  }

  return next();
};

module.exports = verifyExotelWebhook;
