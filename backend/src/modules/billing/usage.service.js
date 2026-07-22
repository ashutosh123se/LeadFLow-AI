const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');

/**
 * Usage metering service — checks resource usage against plan limits in real time.
 * Called before any resource-consuming action (AI call, WhatsApp message, employee add).
 */
class UsageService {
  /**
   * Check if the organization can use a specific resource.
   * Returns { allowed, used, limit, remaining, percentage }
   * Throws ApiError(402) if limit exceeded and throwOnExceed is true.
   */
  static async checkUsage(orgId, resource, throwOnExceed = true) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    let used, limit, resourceName;

    switch (resource) {
      case 'ai_calls':
        used = org.aiCallsUsed;
        limit = org.aiCallsLimit;
        resourceName = 'AI calls';
        break;

      case 'whatsapp_messages':
        used = org.whatsappMsgUsed;
        limit = org.whatsappMsgLimit;
        resourceName = 'WhatsApp messages';
        break;

      case 'employees': {
        const employeeCount = await prisma.user.count({
          where: { organizationId: orgId, isActive: true },
        });
        used = employeeCount;
        limit = org.planDefinition?.maxEmployees || 5;
        resourceName = 'team members';
        break;
      }

      case 'leads': {
        const leadCount = await prisma.lead.count({
          where: { organizationId: orgId },
        });
        used = leadCount;
        limit = org.planDefinition?.maxLeads || 500;
        resourceName = 'leads';
        break;
      }

      default:
        throw new ApiError(400, `Unknown resource type: ${resource}`);
    }

    const remaining = Math.max(0, limit - used);
    const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
    const allowed = used < limit;

    if (!allowed && throwOnExceed) {
      throw new ApiError(
        402,
        `${resourceName} limit reached (${used}/${limit}). Please upgrade your plan to continue.`
      );
    }

    return { allowed, used, limit, remaining, percentage, resourceName };
  }

  /**
   * Increment usage counter for a resource.
   * Validates limit before incrementing.
   */
  static async incrementUsage(orgId, resource, amount = 1) {
    // Check first
    await this.checkUsage(orgId, resource, true);

    switch (resource) {
      case 'ai_calls':
        await prisma.organization.update({
          where: { id: orgId },
          data: { aiCallsUsed: { increment: amount } },
        });
        break;

      case 'whatsapp_messages':
        await prisma.organization.update({
          where: { id: orgId },
          data: { whatsappMsgUsed: { increment: amount } },
        });
        break;

      default:
        // employees and leads don't have a simple counter — they're model counts
        break;
    }
  }

  /**
   * Reset monthly usage counters (called by billing webhook on subscription renewal)
   */
  static async resetMonthlyUsage(orgId) {
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        aiCallsUsed: 0,
        whatsappMsgUsed: 0,
      },
    });

    logger.info(`Monthly usage counters reset for org ${orgId}`);
  }

  /**
   * Check if a feature is enabled for the organization's current plan
   */
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

  /**
   * Get usage warnings (for notification system)
   * Returns warnings for resources near their limit (>80%)
   */
  static async getUsageWarnings(orgId) {
    const warnings = [];
    const resources = ['ai_calls', 'whatsapp_messages', 'employees', 'leads'];

    for (const resource of resources) {
      try {
        const usage = await this.checkUsage(orgId, resource, false);
        if (usage.percentage >= 90) {
          warnings.push({
            resource,
            level: 'critical',
            message: `${usage.resourceName}: ${usage.used}/${usage.limit} used (${usage.percentage}%)`,
            ...usage,
          });
        } else if (usage.percentage >= 80) {
          warnings.push({
            resource,
            level: 'warning',
            message: `${usage.resourceName}: ${usage.used}/${usage.limit} used (${usage.percentage}%)`,
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
