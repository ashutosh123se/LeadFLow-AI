const sgMail = require('@sendgrid/mail');
const emailQueue = require('../emailQueue');
const sendgridConfig = require('../../config/sendgrid');
const logger = require('../../utils/logger');

// Set SendGrid API Key
if (sendgridConfig.apiKey) {
  sgMail.setApiKey(sendgridConfig.apiKey);
}

emailQueue.process(async (job) => {
  const { to, subject, html, text } = job.data;
  logger.info(`Sending transaction email to ${to} with subject: "${subject}"`);

  try {
    if (!sendgridConfig.apiKey) {
      logger.warn('SendGrid API key not configured. Mocking email delivery in console.');
      logger.info(`--- MOCK EMAIL TO ${to} ---`);
      logger.info(`Subject: ${subject}`);
      logger.info(`Content: ${text || html}`);
      logger.info(`--------------------------`);
      return;
    }

    const msg = {
      to,
      from: {
        email: sendgridConfig.fromEmail,
        name: sendgridConfig.fromName,
      },
      subject,
      text: text || 'LeadLFlowAI Notification',
      html: html || `<p>${text}</p>`,
    };

    const response = await sgMail.send(msg);
    logger.info(`Email sent successfully via SendGrid. Status: ${response[0]?.statusCode}`);
  } catch (error) {
    logger.error(`Error in emailWorker sending email to ${to}:`, error.response?.body || error.message);
    throw error;
  }
});
