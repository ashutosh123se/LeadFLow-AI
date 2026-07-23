const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const { getUpgradeSuggestion } = require('./planFeatures');
const OverageService = require('./overage.service');

/**
 * Usage metering — enforces plan limits server-side.
 * AI leads/calls allow overage billing when configured; other resources hard-block at cap.
 */
class UsageService {
  static _resolveAiLimits(org) {
    const slug = org?.planDefinition?.slug || org?.plan || 'STARTER';
    const rate = org?.planDefinition?.overageRatePerLead ?? 0;
    let limit = org.aiCallsLimit;
    let used = org.aiCallsUsed;

    if (org.isTrialing && org.trialLeadCap != null) {
      limit = org.trialLeadCap;
    }

    const inOverage = used >= org.aiCallsLimit && !org.isTrialing;
    const allowsOverage = inOverage && (rate > 0 || slug === 'ENTERPRISE');
    const allowed = used < limit || allowsOverage;

    return {
      used,
      limit,
      planLimit: org.aiCallsLimit,
      remaining: Math.max(0, limit - used),
      percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
      allowed,
      inOverage,
      allowsOverage,
      overageRate: rate,
      resourceName: 'AI leads/calls',
    };
  }

  static async checkUsage(orgId, resource, throwOnExceed = true) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    let result;

    switch (resource) {
      case 'ai_calls':
        result = this._resolveAiLimits(org);
        break;

      case 'whatsapp_messages': {
        const used = org.whatsappMsgUsed;
        const limit = org.whatsappMsgLimit;
        result = {
          used,
          limit,
          remaining: Math.max(0, limit - used),
          percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
          allowed: used < limit,
          resourceName: 'WhatsApp messages',
        };
        break;
      }

      case 'employees': {
        const employeeCount = await prisma.user.count({
          where: { organizationId: orgId, isActive: true },
        });
        const limit = org.planDefinition?.maxEmployees ?? 2;
        result = {
          used: employeeCount,
          limit,
          remaining: Math.max(0, limit - employeeCount),
          percentage: limit > 0 ? Math.round((employeeCount / limit) * 100) : 0,
          allowed: limit == null || employeeCount < limit,
          resourceName: 'team members',
        };
        break;
      }

      case 'leads': {
        const leadCount = await prisma.lead.count({
          where: { organizationId: orgId },
        });
        const limit = org.planDefinition?.maxLeads || 500;
        result = {
          used: leadCount,
          limit,
          remaining: Math.max(0, limit - leadCount),
          percentage: limit > 0 ? Math.round((leadCount / limit) * 100) : 0,
          allowed: leadCount < limit,
          resourceName: 'leads',
        };
        break;
      }

      default:
        throw new ApiError(400, `Unknown resource type: ${resource}`);
    }

    if (!result.allowed && throwOnExceed) {
      const upgrade = resource === 'ai_calls' ? getUpgradeSuggestion(org, 'lead_cap') : null;
      throw new ApiError(
        402,
        `${result.resourceName} limit reached (${result.used}/${result.limit}). Please upgrade your plan to continue.`,
        upgrade ? { upgrade } : undefined
      );
    }

    return result;
  }

  static async incrementUsage(orgId, resource, amount = 1) {
    if (resource === 'ai_calls') {
      return OverageService.recordLeadOverage(orgId, amount);
    }

    await this.checkUsage(orgId, resource, true);

    if (resource === 'whatsapp_messages') {
      await prisma.organization.update({
        where: { id: orgId },
        data: { whatsappMsgUsed: { increment: amount } },
      });
    }

    return { type: 'included', overage: false };
  }

  static async resetMonthlyUsage(orgId) {
    const OverageServiceRef = require('./overage.service');
    await OverageServiceRef.settlePendingOverage(orgId);

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        aiCallsUsed: 0,
        whatsappMsgUsed: 0,
        overageLeadsUsed: 0,
        overageAmountPending: 0,
      },
    });

    logger.info(`Monthly usage counters reset for org ${orgId}`);
  }

  static async isFeatureEnabled(orgId, featureKey) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (!org?.planDefinition?.featureFlags) {
      return false;
    }

    const flags = typeof org.planDefinition.featureFlags === 'string'
      ? JSON.parse(org.planDefinition.featureFlags)
      : org.planDefinition.featureFlags;

    return flags[featureKey] === true;
  }

  static async getUsageWarnings(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });
    if (!org) return [];

    const warnings = [];
    const resources = ['ai_calls', 'whatsapp_messages', 'employees', 'leads'];

    for (const resource of resources) {
      try {
        const usage = await this.checkUsage(orgId, resource, false);
        if (usage.percentage >= 90) {
          warnings.push({
            resource,
            level: usage.inOverage ? 'overage' : 'critical',
            message: `${usage.resourceName}: ${usage.used}/${usage.limit} used (${usage.percentage}%)`,
            upgrade: resource === 'ai_calls' ? getUpgradeSuggestion(org, 'approaching_cap') : null,
            ...usage,
          });
        } else if (usage.percentage >= 80) {
          warnings.push({
            resource,
            level: 'warning',
            message: `${usage.resourceName}: ${usage.used}/${usage.limit} used (${usage.percentage}%)`,
            upgrade: resource === 'ai_calls' ? getUpgradeSuggestion(org, 'approaching_cap') : null,
            ...usage,
          });
        }
      } catch (err) {
        // Non-critical
      }
    }

    return warnings;
  }
}

module.exports = UsageService;
