const axios = require('axios');
const whatsappQueue = require('../whatsappQueue');
const { prisma } = require('../../config/db');
const whatsappConfig = require('../../config/whatsapp');
const UsageService = require('../../modules/billing/usage.service');
const logger = require('../../utils/logger');
const { emitToOrg } = require('../../config/socket');

whatsappQueue.process(async (job) => {
  const { organizationId, leadId, phone, templateName, variables } = job.data;
  logger.info(`Sending WhatsApp template '${templateName}' to ${phone} in org ${organizationId}`);

  try {
    // 1. Fetch organization details for Meta token/phone ID
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    await UsageService.checkUsage(organizationId, 'whatsapp_messages', true);

    const waToken = org.whatsappToken || whatsappConfig.token;
    const waPhoneId = org.whatsappPhoneId || whatsappConfig.phoneNumberId;

    if (!waToken || !waPhoneId) {
      throw new Error('WhatsApp Business API credentials are not configured.');
    }

    // 2. Build template parameters
    const parameters = (variables || []).map((val) => ({
      type: 'text',
      text: String(val),
    }));

    const payload = {
      messaging_product: 'whatsapp',
      to: phone.startsWith('+') ? phone.replace('+', '') : `91${phone}`, // default to India code if not present
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US', // Meta template language code
        },
        components: [
          {
            type: 'body',
            parameters,
          },
        ],
      },
    };

    const waUrl = `${whatsappConfig.apiUrl || 'https://graph.facebook.com/v18.0'}/${waPhoneId}/messages`;

    // 3. Post message to Meta Graph API
    logger.info(`Posting WhatsApp payload to Meta: url=${waUrl}, template=${templateName}`);
    const response = await axios.post(waUrl, payload, {
      headers: {
        Authorization: `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
    });

    const waMessageId = response.data?.messages?.[0]?.id;

    if (!waMessageId) {
      throw new Error(`WhatsApp API failed to return message ID. Response: ${JSON.stringify(response.data)}`);
    }

    // 4. Create the Outbound WhatsappMessage record
    const content = `Template: ${templateName} | Variables: ${JSON.stringify(variables)}`;
    const message = await prisma.whatsappMessage.create({
      data: {
        organizationId,
        leadId,
        waMessageId,
        direction: 'OUTBOUND',
        type: 'template',
        content,
        templateName,
        status: 'sent',
      },
    });

    // 5. Update Lead lastContactedAt
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastContactedAt: new Date(),
      },
    });

    // 6. Emit real-time notification socket
    emitToOrg(organizationId, 'whatsapp:sent', {
      messageId: message.id,
      leadId,
      templateName,
      status: 'sent',
    });

    await UsageService.incrementUsage(organizationId, 'whatsapp_messages', 1);

    logger.info(`WhatsApp message successfully sent. Meta SID: ${waMessageId}`);
  } catch (error) {
    logger.error(`Error in whatsappWorker sending message to ${phone}:`, error.response?.data || error.message);
    throw error;
  }
});
