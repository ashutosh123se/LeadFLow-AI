const WhatsappService = require('./whatsapp.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await WhatsappService.getConversations(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, conversations, 'Conversations fetched successfully.')
  );
});

const getMessages = asyncHandler(async (req, res) => {
  const messages = await WhatsappService.getMessages(req.organizationId, req.params.leadId);
  res.status(200).json(
    new ApiResponse(200, messages, 'Message history fetched successfully.')
  );
});

const sendMessage = asyncHandler(async (req, res) => {
  const { leadId, templateName, variables } = req.body;
  await WhatsappService.queueMessage(req.organizationId, leadId, templateName, variables);
  res.status(200).json(
    new ApiResponse(200, null, 'Outbound WhatsApp message queued.')
  );
});

const getTemplates = asyncHandler(async (req, res) => {
  const templates = await WhatsappService.getTemplates(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, templates, 'WhatsApp templates fetched successfully.')
  );
});

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  getTemplates,
};
