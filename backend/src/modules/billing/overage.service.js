const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const InvoiceService = require('./invoice.service');
const logger = require('../../utils/logger');
const { getUpgradeSuggestion } = require('./planFeatures');

class OverageService {
  static async recordLeadOverage(orgId, amount = 1) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    if (org.isTrialing && org.trialLeadCap != null) {
      if (org.aiCallsUsed + amount > org.trialLeadCap) {
        throw new ApiError(
          402,
          `Trial limit reached (${org.trialLeadCap} leads). Subscribe to a paid plan to continue.`,
          { upgrade: getUpgradeSuggestion(org, 'trial_cap') }
        );
      }
      await prisma.organization.update({
        where: { id: orgId },
        data: { aiCallsUsed: { increment: amount } },
      });
      return { type: 'included', overage: false, trial: true };
    }

    const rate = org.planDefinition?.overageRatePerLead ?? 0;
    const slug = org.planDefinition?.slug || org.plan;

    if (org.aiCallsUsed + amount <= org.aiCallsLimit) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { aiCallsUsed: { increment: amount } },
      });
      return { type: 'included', overage: false };
    }

    if (slug === 'ENTERPRISE' || rate > 0) {
      const overageCharge = rate * amount;
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          aiCallsUsed: { increment: amount },
          overageLeadsUsed: { increment: amount },
          overageAmountPending: { increment: overageCharge },
        },
      });
      logger.info(`Overage recorded for org ${orgId}: ${amount} lead(s) at ₹${rate}/lead`);
      return {
        type: 'overage',
        overage: true,
        rate,
        amount: overageCharge,
        pendingTotal: org.overageAmountPending + overageCharge,
      };
    }

    throw new ApiError(
      402,
      `Monthly lead cap reached (${org.aiCallsLimit}). Upgrade your plan to continue.`,
      { upgrade: getUpgradeSuggestion(org, 'lead_cap') }
    );
  }

  static async settlePendingOverage(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (!org || org.overageAmountPending <= 0) {
      return null;
    }

    const invoice = await InvoiceService.createFromPayment({
      organizationId: orgId,
      planName: `${org.planDefinition?.name || org.plan} — Lead overage (${org.overageLeadsUsed} leads)`,
      amount: org.overageAmountPending,
      billingPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      billingPeriodEnd: new Date(),
      status: 'paid',
    });

    logger.info(`Overage invoice ${invoice.invoiceNumber} for org ${orgId}: ₹${org.overageAmountPending}`);

    return invoice;
  }
}

module.exports = OverageService;
