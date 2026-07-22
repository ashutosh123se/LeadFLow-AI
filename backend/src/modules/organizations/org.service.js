const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { encrypt, decrypt } = require('../../utils/encryption');
const AuditService = require('../audit/audit.service');

class OrgService {
  static async getOrg(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    // Mask sensitive credentials before sending to UI
    return {
      ...org,
      exotelApiToken: org.exotelApiToken ? '[ENCRYPTED]' : null,
      whatsappToken: org.whatsappToken ? '[ENCRYPTED]' : null,
    };
  }

  static async updateOrg(orgId, data, reqContext = {}) {
    const { name, logo, industry, timezone, workingDays, defaultLanguage } = data;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo;
    if (industry !== undefined) updateData.industry = industry;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (workingDays !== undefined) updateData.workingDays = workingDays;
    if (defaultLanguage !== undefined) updateData.defaultLanguage = defaultLanguage;

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    await AuditService.log({
      organizationId: orgId,
      action: 'organization.updated',
      entityType: 'Organization',
      entityId: orgId,
      details: { changes: Object.keys(updateData) },
      ...reqContext,
    });

    return org;
  }

  static async updateAiCallerSettings(orgId, data, reqContext = {}) {
    const {
      aiCallerEnabled,
      aiCallerLanguage,
      aiCallerVoice,
      qualifyQuestions,
      scoringPrompt,
      callingHoursStart,
      callingHoursEnd,
      maxConcurrentCalls,
      exotelApiKey,
      exotelApiToken,
      exotelSubdomain,
      exotelCallerId,
    } = data;

    const updateData = {};

    if (aiCallerEnabled !== undefined) updateData.aiCallerEnabled = aiCallerEnabled;
    if (aiCallerLanguage) updateData.aiCallerLanguage = aiCallerLanguage;
    if (aiCallerVoice) updateData.aiCallerVoice = aiCallerVoice;
    if (qualifyQuestions !== undefined) updateData.qualifyQuestions = qualifyQuestions;
    if (scoringPrompt !== undefined) updateData.scoringPrompt = scoringPrompt;
    if (callingHoursStart) updateData.callingHoursStart = callingHoursStart;
    if (callingHoursEnd) updateData.callingHoursEnd = callingHoursEnd;
    if (maxConcurrentCalls) updateData.maxConcurrentCalls = maxConcurrentCalls;
    if (exotelApiKey) updateData.exotelApiKey = exotelApiKey;
    if (exotelSubdomain) updateData.exotelSubdomain = exotelSubdomain;
    if (exotelCallerId) updateData.exotelCallerId = exotelCallerId;

    if (exotelApiToken && exotelApiToken !== '[ENCRYPTED]') {
      updateData.exotelApiToken = encrypt(exotelApiToken);
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    await AuditService.log({
      organizationId: orgId,
      action: 'organization.ai_settings_updated',
      entityType: 'Organization',
      entityId: orgId,
      details: { changes: Object.keys(updateData) },
      ...reqContext,
    });

    return org;
  }

  static async updateWhatsappSettings(orgId, data, reqContext = {}) {
    const { whatsappPhoneId, whatsappToken } = data;

    const updateData = {};
    if (whatsappPhoneId) updateData.whatsappPhoneId = whatsappPhoneId;

    if (whatsappToken && whatsappToken !== '[ENCRYPTED]') {
      updateData.whatsappToken = encrypt(whatsappToken);
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    await AuditService.log({
      organizationId: orgId,
      action: 'organization.whatsapp_settings_updated',
      entityType: 'Organization',
      entityId: orgId,
      ...reqContext,
    });

    return org;
  }

  static async getUsage(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    const userCount = await prisma.user.count({
      where: { organizationId: orgId, isActive: true },
    });

    const leadCount = await prisma.lead.count({
      where: { organizationId: orgId },
    });

    return {
      plan: org.plan,
      planName: org.planDefinition?.name || `${org.plan} Plan`,
      aiCallsUsed: org.aiCallsUsed,
      aiCallsLimit: org.aiCallsLimit,
      whatsappMsgUsed: org.whatsappMsgUsed,
      whatsappMsgLimit: org.whatsappMsgLimit,
      planExpiresAt: org.planExpiresAt,
      userCount,
      maxEmployees: org.planDefinition?.maxEmployees || 5,
      leadCount,
      maxLeads: org.planDefinition?.maxLeads || 500,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUSPEND / REACTIVATE / SOFT DELETE
  // ─────────────────────────────────────────────────────────────────────────
  static async suspendOrg(orgId, reason = null, reqContext = {}) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new ApiError(404, 'Organization not found.');

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        suspendedAt: new Date(),
        suspendedReason: reason,
        aiCallerEnabled: false, // disable AI caller
      },
    });

    // Invalidate all user sessions in this org
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    if (users.length > 0) {
      await prisma.session.updateMany({
        where: { userId: { in: users.map((u) => u.id) } },
        data: { isActive: false },
      });
    }

    await AuditService.log({
      organizationId: orgId,
      action: 'organization.suspended',
      entityType: 'Organization',
      entityId: orgId,
      details: { reason },
      ...reqContext,
    });

    return true;
  }

  static async reactivateOrg(orgId, reqContext = {}) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new ApiError(404, 'Organization not found.');

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        suspendedAt: null,
        suspendedReason: null,
        isActive: true,
        failedPaymentCount: 0,
      },
    });

    await AuditService.log({
      organizationId: orgId,
      action: 'organization.reactivated',
      entityType: 'Organization',
      entityId: orgId,
      ...reqContext,
    });

    return true;
  }

  static async softDeleteOrg(orgId, reqContext = {}) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new ApiError(404, 'Organization not found.');

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        aiCallerEnabled: false,
      },
    });

    // Invalidate all sessions
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    if (users.length > 0) {
      await prisma.session.updateMany({
        where: { userId: { in: users.map((u) => u.id) } },
        data: { isActive: false },
      });

      await prisma.user.updateMany({
        where: { organizationId: orgId },
        data: { isActive: false, refreshTokenHash: null },
      });
    }

    await AuditService.log({
      organizationId: orgId,
      action: 'organization.soft_deleted',
      entityType: 'Organization',
      entityId: orgId,
      ...reqContext,
    });

    return true;
  }
}

module.exports = OrgService;
