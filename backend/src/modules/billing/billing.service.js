const Razorpay = require('razorpay');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const razorpayConfig = require('../../config/razorpay');
const AuditService = require('../audit/audit.service');
const logger = require('../../utils/logger');

let razorpay = null;
if (razorpayConfig.keyId && razorpayConfig.keyId !== 'rzp_test_placeholder') {
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
          name: 'Starter Plan',
          priceMonthly: 1999,
          maxEmployees: 5,
          maxAiCalls: 20,
          maxWhatsappMsg: 100,
          features: ['20 AI calls/month', 'Up to 5 team members', 'Basic CRM'],
          isPopular: false,
        },
        {
          id: 'fallback-growth',
          slug: 'GROWTH',
          name: 'Growth Plan',
          priceMonthly: 3499,
          maxEmployees: 15,
          maxAiCalls: 75,
          maxWhatsappMsg: 500,
          features: ['75 AI calls/month', 'Up to 15 team members', 'Meta Ads integration'],
          isPopular: true,
        },
        {
          id: 'fallback-pro',
          slug: 'PRO',
          name: 'Pro Plan',
          priceMonthly: 5999,
          maxEmployees: 9999,
          maxAiCalls: 200,
          maxWhatsappMsg: 2000,
          features: ['200 AI calls/month', 'Unlimited team members', 'All integrations'],
          isPopular: false,
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

    const employeeCount = await prisma.user.count({
      where: { organizationId: orgId, isActive: true },
    });

    const leadCount = await prisma.lead.count({
      where: { organizationId: orgId },
    });

    return {
      plan: {
        tier: org.plan,
        name: org.planDefinition?.name || `${org.plan} Plan`,
        slug: org.planDefinition?.slug || org.plan,
      },
      usage: {
        aiCalls: { used: org.aiCallsUsed, limit: org.aiCallsLimit, percentage: Math.round((org.aiCallsUsed / org.aiCallsLimit) * 100) },
        whatsappMessages: { used: org.whatsappMsgUsed, limit: org.whatsappMsgLimit, percentage: Math.round((org.whatsappMsgUsed / org.whatsappMsgLimit) * 100) },
        employees: { used: employeeCount, limit: org.planDefinition?.maxEmployees || 5, percentage: Math.round((employeeCount / (org.planDefinition?.maxEmployees || 5)) * 100) },
        leads: { used: leadCount, limit: org.planDefinition?.maxLeads || 500 },
      },
      planExpiresAt: org.planExpiresAt,
      billingInterval: 'monthly',
      razorpaySubId: org.razorpaySubId,
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

    const price = billingInterval === 'annual' ? planDef.priceAnnual : planDef.priceMonthly;
    const periodDays = billingInterval === 'annual' ? 365 : 30;

    // Check if this is a free trial
    const isTrialEligible = planDef.trialDays > 0 && !org.razorpaySubId && org.plan === 'STARTER';

    // Mock response if Razorpay is not configured
    if (!razorpay) {
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
        paymentUrl: `${process.env.CLIENT_URL || 'https://app.leadflowai.com'}/dashboard?subscription=success`,
        mocked: true,
        isTrialEligible,
      };
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

    if (org.planDefinition?.slug === newPlanSlug) {
      throw new ApiError(400, 'You are already on this plan.');
    }

    const isUpgrade = newPlanDef.priceMonthly > (org.planDefinition?.priceMonthly || 0);

    // For mock/dev mode, just update directly
    if (!razorpay || !org.razorpaySubId || org.razorpaySubId.startsWith('sub_mock_')) {
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: newPlanSlug,
          planDefinitionId: newPlanDef.id,
          aiCallsLimit: newPlanDef.maxAiCalls,
          whatsappMsgLimit: newPlanDef.maxWhatsappMsg,
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
    // (Razorpay doesn't natively support plan switching, so we cancel + re-create)
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

    if (razorpay && !org.razorpaySubId.startsWith('sub_mock_')) {
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
        aiCallsLimit: starterPlan?.maxAiCalls || 20,
        whatsappMsgLimit: starterPlan?.maxWhatsappMsg || 100,
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
