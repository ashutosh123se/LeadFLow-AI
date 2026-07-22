const logger = require('../utils/logger');

const exotelConfig = {
  apiKey: process.env.EXOTEL_API_KEY,
  apiToken: process.env.EXOTEL_API_TOKEN,
  subdomain: process.env.EXOTEL_SUBDOMAIN,
  callerId: process.env.EXOTEL_CALLER_ID,
  appId: process.env.EXOTEL_APP_ID,
};

// Validate required config in production
if (process.env.NODE_ENV === 'production') {
  const missing = [];
  if (!exotelConfig.apiKey) missing.push('EXOTEL_API_KEY');
  if (!exotelConfig.apiToken) missing.push('EXOTEL_API_TOKEN');
  if (!exotelConfig.subdomain) missing.push('EXOTEL_SUBDOMAIN');
  if (!exotelConfig.callerId) missing.push('EXOTEL_CALLER_ID');
  
  if (missing.length > 0) {
    logger.warn(`Production environment warning: Missing Exotel keys: ${missing.join(', ')}`);
  }
}

module.exports = exotelConfig;
