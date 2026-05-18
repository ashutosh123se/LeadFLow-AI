const whatsappConfig = {
  apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
  token: process.env.WHATSAPP_TOKEN,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
};

module.exports = whatsappConfig;
