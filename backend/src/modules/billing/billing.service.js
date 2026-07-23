const Razorpay = require('razorpay');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const razorpayConfig = require('../../config/razorpay');
const AuditService = require('../audit/audit.service');
const logger = require('../../utils/logger');

let razorpay = null;
if (razorpayConfig.isConfigured()) {
  razorpay = new Razorpay({
    key_id: razorpayConfig.keyId,
    key_secret: razorpayConfig.keySecret,
  });
}

class BillingService {
  // ─────────────────────────────────────────────────────────────────────────
  // GET PLANS — from database (no more hardcoded!)
  // ─────────────────────────────────────────────────────────────────────────
  static async getPlans() {
    const plans = await prisma.planDefinition.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Fallback to hardcoded if DB has no plans yet (first-run scenario)
    if (plans.length === 0) {
      return [
        {
          id: 'fallback-starter',
          slug: 'STARTER',
          name: 'Starter',
          priceMonthly: 13500,
          priceAnnual: 137700,
          maxEmployees: 2,
          maxAiCalls: 500,
          maxWhatsappMsg: 200,
          overageRatePerLead: 20,
          trialDays: 14,
          trialLeadCap: 25,
          isPopular: false,
          features: ['500 AI leads/month', '2 team members', 'Website form only'],
        },
        {
          id: 'fallback-growth',
          slug: 'GROWTH',
          name: 'Growth',
          priceMonthly: 37500,
          priceAnnual: 382500,
          maxEmployees: 5,
          maxAiCalls: 1500,
          maxWhatsappMsg: 1000,
          overageRatePerLead: 18,
          isPopular: true,
          features: ['1,500 AI leads/month', '5 team members', 'Facebook, IndiaMART, JustDial'],
        },
        {
          id: 'fallback-scale',
          slug: 'SCALE',
          name: 'Scale',
          priceMonthly: 110000,
          priceAnnual: 1122000,
          maxEmployees: 15,
          maxAiCalls: 5000,
          maxWhatsappMsg: 5000,
          overageRatePerLead: 15,
          isPopular: false,
          features: ['5,000 AI leads/month', '15 team members', 'Zapier + unlimited automations'],
        },
        {
          id: 'fallback-enterprise',
          slug: 'ENTERPRISE',
          name: 'Enterprise',
          priceMonthly: 0,
          priceAnnual: null,
          maxEmployees: 9999,
          maxAiCalls: 5000,
          overageRatePerLead: 0,
          isPopular: false,
          features: ['Custom volume & pricing', 'Dedicated account manager'],
        },
      ];
    }

    return plans;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET CURRENT PLAN & USAGE — for dashboard display
  // ─────────────────────────────────────────────────────────────────────────
  static async getCurrentPlanUsage(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    const UsageService = require('./usage.service');
    const { getUpgradeSuggestion } = require('./planFeatures');

    const employeeCount = await prisma.user.count({
      where: { organizationId: orgId, isActive: true },
    });

    const leadCount = await prisma.lead.count({
      where: { organizationId: orgId },
    });

    const aiUsage = UsageService._resolveAiLimits(org);
    const displayLimit = org.isTrialing && org.trialLeadCap != null ? org.trialLeadCap : org.aiCallsLimit;
    const maxEmployees = org.planDefinition?.maxEmployees ?? 2;

    const nearCap = aiUsage.percentage >= 80;
    const atCap = aiUsage.used >= displayLimit;

    return {
      plan: {
        tier: org.plan,
        name: org.planDefinition?.name || `${org.plan} Plan`,
        slug: org.planDefinition?.slug || org.plan,
        isTrialing: org.isTrialing,
        overageRatePerLead: org.planDefinition?.overageRatePerLead ?? 0,
      },
      usage: {
        aiCalls: {
          used: org.aiCallsUsed,
          limit: displayLimit,
          planLimit: org.aiCallsLimit,
          percentage: displayLimit > 0 ? Math.round((org.aiCallsUsed / displayLimit) * 100) : 0,
          inOverage: aiUsage.inOverage,
          overageLeadsUsed: org.overageLeadsUsed,
          overageAmountPending: org.overageAmountPending,
        },
        whatsappMessages: {
          used: org.whatsappMsgUsed,
          limit: org.whatsappMsgLimit,
          percentage: org.whatsappMsgLimit > 0 ? Math.round((org.whatsappMsgUsed / org.whatsappMsgLimit) * 100) : 0,
        },
        employees: {
          used: employeeCount,
          limit: maxEmployees,
          percentage: maxEmployees > 0 ? Math.round((employeeCount / maxEmployees) * 100) : 0,
        },
        leads: { used: leadCount, limit: org.planDefinition?.maxLeads || 500 },
      },
      planExpiresAt: org.planExpiresAt,
      billingInterval: org.billingInterval || 'monthly',
      razorpaySubId: org.razorpaySubId,
      upgradePrompt: (nearCap || atCap) ? getUpgradeSuggestion(org, atCap ? 'lead_cap' : 'approaching_cap') : null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────────────────
  static async createSubscription(orgId, planSlug, billingInterval = 'monthly', reqContext = {}) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    // Find the plan from database
    const planDef = await prisma.planDefinition.findUnique({
      where: { slug: planSlug },
    });

    if (!planDef) {
      throw new ApiError(400, 'Invalid subscription plan selection.');
    }

    if (planSlug === 'ENTERPRISE') {
      throw new ApiError(400, 'Enterprise plans require a custom quote. Contact sales@leadflow.ai.');
    }

    const price = billingInterval === 'annual' ? planDef.priceAnnual : planDef.priceMonthly;
    const periodDays = billingInterval === 'annual' ? 365 : 30;

    const isTrialEligible = planDef.trialDays > 0 && !org.razorpaySubId && org.plan === 'STARTER';
    const trialLeadCap = isTrialEligible ? (planDef.trialLeadCap || 25) : null;

    // Explicit sandbox only — never silent mock fallback
    if (razorpayConfig.isMockMode()) {
      if (process.env.NODE_ENV === 'production') {
        throw new ApiError(500, 'BILLING_MOCK_MODE cannot be enabled in production.');
      }
      const mockSubId = `sub_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);
      const trialEnd = isTrialEligible ? new Date(Date.now() + planDef.trialDays * 24 * 60 * 60 * 1000) : null;

      await prisma.$transaction([
        prisma.organization.update({
          where: { id: orgId },
          data: {
            plan: planSlug,
            planDefinitionId: planDef.id,
            aiCallsLimit: planDef.maxAiCalls,
            aiCallsUsed: 0,
            whatsappMsgLimit: planDef.maxWhatsappMsg,
            whatsappMsgUsed: 0,
            isTrialing: isTrialEligible,
            trialLeadCap: trialLeadCap,
            billingInterval,
            razorpaySubId: mockSubId,
            planExpiresAt: trialEnd || periodEnd,
          },
        }),
        prisma.subscription.create({
          data: {
            organizationId: orgId,
            planDefinitionId: planDef.id,
            plan: planSlug,
            status: isTrialEligible ? 'trialing' : 'active',
            amount: isTrialEligible ? 0 : price,
            currency: 'INR',
            billingInterval,
            razorpaySubId: mockSubId,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEnd || periodEnd,
            trialEndsAt: trialEnd,
          },
        }),
      ]);

      await AuditService.log({
        organizationId: orgId,
        action: 'billing.subscription_created',
        entityType: 'Subscription',
        details: { planSlug, billingInterval, mocked: true, isTrialEligible },
        ...reqContext,
      });

      return {
        id: mockSubId,
        paymentUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?subscription=success&mock=1`,
        mocked: true,
        mockMode: true,
        isTrialEligible,
      };
    }

    if (!razorpay) {
      throw new ApiError(
        503,
        'Razorpay is not configured. Set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET or enable BILLING_MOCK_MODE=true for local sandbox testing only.'
      );
    }

    try {
      // Real Razorpay subscription flow
      let customerId = org.razorpayCustomerId;
      if (!customerId) {
        const ownerUser = await prisma.user.findFirst({
          where: { organizationId: orgId, role: 'OWNER' },
        });
        const customer = await razorpay.customers.create({
          name: org.name,
          email: ownerUser?.email || `billing@${org.slug}.com`,
        });
        customerId = customer.id;
        await prisma.organization.update({
          where: { id: orgId },
          data: { razorpayCustomerId: customerId },
        });
      }

      // Use the Razorpay plan ID from the plan definition
      const rzpPlanId = billingInterval === 'annual'
        ? planDef.razorpayPlanIdAnnual
        : planDef.razorpayPlanIdMonthly;

      if (!rzpPlanId) {
        throw new ApiError(500, `Razorpay plan ID not configured for ${planDef.name} (${billingInterval}). Contact support.`);
      }

      const subscriptionOptions = {
        plan_id: rzpPlanId,
        customer_id: customerId,
        total_count: billingInterval === 'annual' ? 1 : 12,
        quantity: 1,
      };

      // Add trial if eligible
      if (isTrialEligible && planDef.trialDays > 0) {
        subscriptionOptions.start_at = Math.floor((Date.now() + planDef.trialDays * 24 * 60 * 60 * 1000) / 1000);
      }

      const subscription = await razorpay.subscriptions.create(subscriptionOptions);

      await AuditService.log({
        organizationId: orgId,
        action: 'billing.subscription_created',
        entityType: 'Subscription',
        details: { planSlug, billingInterval, razorpaySubId: subscription.id },
        ...reqContext,
      });

      return {
        id: subscription.id,
        paymentUrl: subscription.short_url,
      };
    } catch (error) {
      throw new ApiError(500, `Razorpay subscription creation failed: ${error.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPGRADE / DOWNGRADE
  // ─────────────────────────────────────────────────────────────────────────
  static async changePlan(orgId, newPlanSlug, billingInterval = 'monthly', reqContext = {}) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    const newPlanDef = await prisma.planDefinition.findUnique({
      where: { slug: newPlanSlug },
    });

    if (!newPlanDef) {
      throw new ApiError(400, 'Invalid plan selection.');
    }

    if (newPlanSlug === 'ENTERPRISE') {
      throw new ApiError(400, 'Enterprise plans require a custom quote. Contact sales@leadflow.ai.');
    }

    if (org.planDefinition?.slug === newPlanSlug) {
      throw new ApiError(400, 'You are already on this plan.');
    }

    const isUpgrade = newPlanDef.priceMonthly > (org.planDefinition?.priceMonthly || 0);

    // For mock/dev mode, just update directly
    if (razorpayConfig.isMockMode()) {
      if (process.env.NODE_ENV === 'production') {
        throw new ApiError(500, 'BILLING_MOCK_MODE cannot be enabled in production.');
      }
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: newPlanSlug,
          planDefinitionId: newPlanDef.id,
          aiCallsLimit: newPlanDef.maxAiCalls,
          whatsappMsgLimit: newPlanDef.maxWhatsappMsg,
          isTrialing: false,
          trialLeadCap: null,
          billingInterval,
        },
      });

      await AuditService.log({
        organizationId: orgId,
        action: isUpgrade ? 'billing.plan_upgraded' : 'billing.plan_downgraded',
        entityType: 'Subscription',
        details: { from: org.plan, to: newPlanSlug },
        ...reqContext,
      });

      return { success: true, isUpgrade };
    }

    // Real Razorpay plan change — cancel old and create new
    if (!razorpay) {
      throw new ApiError(503, 'Razorpay is not configured.');
    }
    try {
      await razorpay.subscriptions.cancel(org.razorpaySubId);
    } catch (err) {
      logger.error('Failed to cancel old subscription during plan change:', err.message);
    }

    return this.createSubscription(orgId, newPlanSlug, billingInterval, reqContext);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CANCEL SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────────────────
  static async cancelSubscription(orgId, reqContext = {}) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org || !org.razorpaySubId) {
      throw new ApiError(400, 'No active recurring subscription found.');
    }

    if (!razorpayConfig.isMockMode()) {
      if (!razorpay) {
        throw new ApiError(503, 'Razorpay is not configured.');
      }
      try {
        await razorpay.subscriptions.cancel(org.razorpaySubId);
      } catch (error) {
        throw new ApiError(500, `Razorpay cancel failed: ${error.message}`);
      }
    }

    // Find the STARTER plan definition
    const starterPlan = await prisma.planDefinition.findUnique({ where: { slug: 'STARTER' } });

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: 'STARTER',
        planDefinitionId: starterPlan?.id || null,
        aiCallsLimit: starterPlan?.maxAiCalls || 500,
        whatsappMsgLimit: starterPlan?.maxWhatsappMsg || 200,
        razorpaySubId: null,
      },
    });

    await prisma.subscription.updateMany({
      where: { organizationId: orgId, razorpaySubId: org.razorpaySubId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    await AuditService.log({
      organizationId: orgId,
      action: 'billing.subscription_cancelled',
      entityType: 'Subscription',
      details: { previousPlan: org.plan },
      ...reqContext,
    });

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET INVOICES
  // ─────────────────────────────────────────────────────────────────────────
  static async getInvoices(orgId, pagination = {}) {
    const { limit = 20, skip = 0 } = pagination;

    const [total, data] = await prisma.$transaction([
      prisma.invoice.count({ where: { organizationId: orgId } }),
      prisma.invoice.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, data };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET SUBSCRIPTION HISTORY
  // ─────────────────────────────────────────────────────────────────────────
  static async getSubscriptionHistory(orgId) {
    const subscriptions = await prisma.subscription.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions;
  }
}

module.exports = BillingService;
