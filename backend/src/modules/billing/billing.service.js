const Razorpay = require('razorpay');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const razorpayConfig = require('../../config/razorpay');

let razorpay = null;
if (razorpayConfig.keyId && razorpayConfig.keyId !== 'rzp_test_placeholder') {
  razorpay = new Razorpay({
    key_id: razorpayConfig.keyId,
    key_secret: razorpayConfig.keySecret,
  });
}

class BillingService {
  static getPlans() {
    return [
      {
        id: 'STARTER',
        name: 'Starter Plan',
        price: 1999,
        callsLimit: 20,
        usersLimit: 5,
        features: [
          '20 AI speed-to-lead calls/month',
          'Up to 5 team members',
          'Standard English / Hindi voices',
          'Prisma CRM contact database',
          'WhatsApp manual templates'
        ],
      },
      {
        id: 'GROWTH',
        name: 'Growth Plan',
        price: 3499,
        callsLimit: 75,
        usersLimit: 15,
        features: [
          '75 AI speed-to-lead calls/month',
          'Up to 15 team members',
          'Sarvam AI ultra-natural Hindi / English voice',
          '90-Second automated call queue',
          'WhatsApp outbound follow-up templates'
        ],
      },
      {
        id: 'PRO',
        name: 'Pro Plan',
        price: 5999,
        callsLimit: 200,
        usersLimit: 9999, // unlimited
        features: [
          '200 AI speed-to-lead calls/month',
          'Unlimited team members',
          'Custom qualifying questions',
          'Advanced multi-step automations',
          'Full-featured integrations (IndiaMart, Zapier)',
          'Dedicated support manager'
        ],
      },
    ];
  }

  static async createSubscription(orgId, planId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    const plans = this.getPlans();
    const plan = plans.find((p) => p.id === planId);

    if (!plan) {
      throw new ApiError(400, 'Invalid subscription plan selection.');
    }

    // Mock response if Razorpay is not configured or in sandbox mode
    if (!razorpay) {
      // Create mock subscription directly in DB
      const mockSubId = `sub_mock_${Math.random().toString(36).substring(7)}`;

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: planId,
          aiCallsLimit: plan.callsLimit,
          aiCallsUsed: 0,
          razorpaySubId: mockSubId,
          planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      await prisma.subscription.create({
        data: {
          organizationId: orgId,
          plan: planId,
          status: 'active',
          amount: plan.price,
          currency: 'INR',
          razorpaySubId: mockSubId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        id: mockSubId,
        paymentUrl: 'https://app.leadflowai.com/settings/billing?success=true',
        mocked: true,
      };
    }

    try {
      // Real Razorpay subscription flow
      // 1. Check or create Razorpay customer
      let customerId = org.razorpayCustomerId;
      if (!customerId) {
        const customer = await razorpay.customers.create({
          name: org.name,
          email: 'finance@' + org.slug + '.com',
        });
        customerId = customer.id;
        await prisma.organization.update({
          where: { id: orgId },
          data: { razorpayCustomerId: customerId },
        });
      }

      // 2. Fetch Razorpay plan ID from Meta or map dynamically. We'll use mock subscriptions for now as defined.
      // In production, Razorpay requires a plan created via Dashboard, e.g. "plan_abc123"
      const rzpPlanId = planId === 'STARTER' ? 'plan_starter_id' : planId === 'GROWTH' ? 'plan_growth_id' : 'plan_pro_id';

      const subscription = await razorpay.subscriptions.create({
        plan_id: rzpPlanId,
        customer_id: customerId,
        total_count: 12,
        quantity: 1,
      });

      return {
        id: subscription.id,
        paymentUrl: subscription.short_url,
      };
    } catch (error) {
      throw new ApiError(500, `Razorpay subscription creation failed: ${error.message}`);
    }
  }

  static async cancelSubscription(orgId) {
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

    // Downgrade organization plan to Free/Starter (mock downgrade)
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: 'STARTER',
        aiCallsLimit: 20, // default limit
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

    return true;
  }

  static async getInvoices(orgId) {
    const invoices = await prisma.subscription.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    return invoices;
  }
}

module.exports = BillingService;
