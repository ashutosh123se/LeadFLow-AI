const { getEnv } = require('./env');

const whatsappConfig = {
  apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
  get token() {
    if (process.env.NODE_ENV === 'production') {
      return getEnv('WHATSAPP_TOKEN', { required: true });
    }
    return process.env.WHATSAPP_TOKEN;
  },
  get verifyToken() {
    if (process.env.NODE_ENV === 'production') {
      return getEnv('WHATSAPP_VERIFY_TOKEN', { required: true });
    }
    return process.env.WHATSAPP_VERIFY_TOKEN;
  },
  get appSecret() {
    if (process.env.NODE_ENV === 'production') {
      return getEnv('WHATSAPP_APP_SECRET', { required: true });
    }
    return process.env.WHATSAPP_APP_SECRET;
  },
  get phoneNumberId() {
    if (process.env.NODE_ENV === 'production') {
      return getEnv('WHATSAPP_PHONE_NUMBER_ID', { required: true });
    }
    return process.env.WHATSAPP_PHONE_NUMBER_ID;
  },
};

module.exports = whatsappConfig;
