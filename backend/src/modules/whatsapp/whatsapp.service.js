const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const whatsappQueue = require('../../queues/whatsappQueue');

class WhatsappService {
  static async getConversations(orgId) {
    // Get unique leads that have whatsapp messages
    const messages = await prisma.whatsappMessage.findMany({
      where: { organizationId: orgId },
      distinct: ['leadId'],
      orderBy: { sentAt: 'desc' },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, status: true, scoreLabel: true },
        },
      },
    });

    return messages.map((m) => ({
      leadId: m.leadId,
      name: m.lead.name,
      phone: m.lead.phone,
      status: m.lead.status,
      scoreLabel: m.lead.scoreLabel,
      lastMessage: m.content,
      lastMessageTime: m.sentAt,
    }));
  }

  static async getMessages(orgId, leadId) {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    const messages = await prisma.whatsappMessage.findMany({
      where: { leadId, organizationId: orgId },
      orderBy: { sentAt: 'asc' },
    });

    return messages;
  }

  static async queueMessage(orgId, leadId, templateName, variables) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    // Add job to WhatsApp Queue
    await whatsappQueue.add({
      organizationId: orgId,
      leadId,
      phone: lead.phone,
      templateName,
      variables,
    });

    return true;
  }

  static async getTemplates(orgId) {
    // Returns built-in CRM templates. Meta templates can also be fetched from the Meta API using org credentials.
    return [
      { name: 'welcome_lead', language: 'en_US', category: 'UTILITY', status: 'APPROVED' },
      { name: 'call_missed', language: 'en_US', category: 'UTILITY', status: 'APPROVED' },
      { name: 'follow_up_1day', language: 'en_US', category: 'UTILITY', status: 'APPROVED' },
      { name: 'follow_up_3day', language: 'en_US', category: 'UTILITY', status: 'APPROVED' },
      { name: 'meeting_reminder', language: 'en_US', category: 'UTILITY', status: 'APPROVED' },
      { name: 'proposal_sent', language: 'en_US', category: 'UTILITY', status: 'APPROVED' },
    ];
  }
}

module.exports = WhatsappService;
