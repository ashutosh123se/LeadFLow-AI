const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { encrypt, decrypt } = require('../../utils/encryption');

class OrgService {
  static async getOrg(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    // Decrypt credentials before sending to UI (if present)
    return {
      ...org,
      exotelApiToken: org.exotelApiToken ? '[ENCRYPTED]' : null,
      whatsappToken: org.whatsappToken ? '[ENCRYPTED]' : null,
    };
  }

  static async updateOrg(orgId, data) {
    const { name, logo, industry } = data;
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name,
        logo,
        industry,
      },
    });
    return org;
  }

  static async updateAiCallerSettings(orgId, data) {
    const {
      aiCallerEnabled,
      aiCallerLanguage,
      aiCallerVoice,
      qualifyQuestions,
      callingHoursStart,
      callingHoursEnd,
      exotelApiKey,
      exotelApiToken,
      exotelSubdomain,
      exotelCallerId,
    } = data;

    // Encrypt sensitive exotel tokens if provided
    const updateData = {
      aiCallerEnabled,
      aiCallerLanguage,
      aiCallerVoice,
      qualifyQuestions,
      callingHoursStart,
      callingHoursEnd,
      exotelApiKey,
      exotelSubdomain,
      exotelCallerId,
    };

    if (exotelApiToken && exotelApiToken !== '[ENCRYPTED]') {
      updateData.exotelApiToken = encrypt(exotelApiToken);
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return org;
  }

  static async updateWhatsappSettings(orgId, data) {
    const { whatsappPhoneId, whatsappToken } = data;

    const updateData = {
      whatsappPhoneId,
    };

    if (whatsappToken && whatsappToken !== '[ENCRYPTED]') {
      updateData.whatsappToken = encrypt(whatsappToken);
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return org;
  }

  static async getUsage(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        plan: true,
        aiCallsUsed: true,
        aiCallsLimit: true,
        planExpiresAt: true,
      },
    });

    const userCount = await prisma.user.count({
      where: { organizationId: orgId },
    });

    const leadCount = await prisma.lead.count({
      where: { organizationId: orgId },
    });

    return {
      plan: org.plan,
      aiCallsUsed: org.aiCallsUsed,
      aiCallsLimit: org.aiCallsLimit,
      planExpiresAt: org.planExpiresAt,
      userCount,
      leadCount,
    };
  }
}

module.exports = OrgService;
