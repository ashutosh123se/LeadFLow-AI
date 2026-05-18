const sendgridConfig = {
  apiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'noreply@leadflowai.com',
  fromName: process.env.FROM_NAME || 'LeadLFlowAI',
};

module.exports = sendgridConfig;
