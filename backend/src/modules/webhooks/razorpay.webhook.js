const express = require('express');
const router = express.Router();
const { prisma } = require('../../config/db');
const razorpayConfig = require('../../config/razorpay');
const logger = require('../../utils/logger');
const emailQueue = require('../../queues/emailQueue');
const InvoiceService = require('../billing/invoice.service');
const UsageService = require('../billing/usage.service');
const { verifyHmacSha256 } = require('../../utils/webhookSignature');

const verifyRazorpaySignature = (req, res, next) => {
  const webhookSecret = razorpayConfig.webhookSecret;
  if (!webhookSecret) {
    logger.error('RAZORPAY_WEBHOOK_SECRET is not configured.');
    return res.status(500).send('Webhook security is not configured.');
  }

  const result = verifyHmacSha256(req, webhookSecret, 'x-razorpay-signature');
  if (!result.ok) {
    logger.error(`Razorpay webhook rejected: ${result.message}`);
    return res.status(result.status).send(result.message);
  }

  return next();
};

const resolvePlanFromRazorpay = async (subscriptionObj) => {
  const rzpPlanId = subscriptionObj?.plan_id;
  if (!rzpPlanId) return null;

  return prisma.planDefinition.findFirst({
    where: {
      OR: [
        { razorpayPlanIdMonthly: rzpPlanId },
        { razorpayPlanIdAnnual: rzpPlanId },
      ],
      isActive: true,
    },
  });
};

router.post('/', verifyRazorpaySignature, async (req, res) => {
  const eventObj = req.body;
  const eventType = eventObj.event;
  const payload = eventObj.payload;

  logger.info(`Received Razorpay Webhook Event: "${eventType}"`);

  try {
    const subscriptionObj = payload?.subscription?.entity;
    const paymentObj = payload?.payment?.entity;
    if (!subscriptionObj) {
      return res.sendStatus(200);
    }

    const razorpaySubId = subscriptionObj.id;
    const org = await prisma.organization.findFirst({
      where: { razorpaySubId },
    });

    if (!org) {
      logger.warn(`Razorpay subscription ID ${razorpaySubId} is not associated with any organization.`);
      return res.sendStatus(200);
    }

    const ownerUser = await prisma.user.findFirst({
      where: { organizationId: org.id, role: 'OWNER' },
    });

    const planDef = await resolvePlanFromRazorpay(subscriptionObj);
    const planSlug = planDef?.slug || org.plan;
    const planPrice = planDef?.priceMonthly || 0;
    const aiLimit = planDef?.maxAiCalls || org.aiCallsLimit;
    const waLimit = planDef?.maxWhatsappMsg || org.whatsappMsgLimit;

    switch (eventType) {
      case 'subscription.activated': {
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const subscriptionRecord = await prisma.$transaction(async (tx) => {
          await tx.organization.update({
            where: { id: org.id },
            data: {
              plan: planSlug,
              planDefinitionId: planDef?.id || org.planDefinitionId,
              aiCallsLimit: aiLimit,
              aiCallsUsed: 0,
              whatsappMsgLimit: waLimit,
              whatsappMsgUsed: 0,
              isActive: true,
              planExpiresAt: periodEnd,
            },
          });

          return tx.subscription.create({
            data: {
              organizationId: org.id,
              planDefinitionId: planDef?.id,
              plan: planSlug,
              status: 'active',
              amount: planPrice,
              currency: 'INR',
              razorpaySubId,
              currentPeriodStart: new Date(),
              currentPeriodEnd: periodEnd,
            },
          });
        });

        await InvoiceService.createFromPayment({
          organizationId: org.id,
          subscriptionId: subscriptionRecord.id,
          planName: planDef?.name || `${planSlug} Plan`,
          amount: planPrice,
          razorpayPaymentId: paymentObj?.id || null,
          billingPeriodStart: new Date(),
          billingPeriodEnd: periodEnd,
        });

        if (ownerUser) {
          await emailQueue.add({
            to: ownerUser.email,
            template: 'payment_receipt',
            variables: {
              companyName: org.name,
              amount: String(planPrice),
              planName: planDef?.name || `${planSlug} Plan`,
              transactionId: razorpaySubId,
            },
          });
        }
        break;
      }

      case 'subscription.charged': {
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const amountPaid = paymentObj?.amount ? paymentObj.amount / 100 : planPrice;

        await UsageService.resetMonthlyUsage(org.id);
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            planExpiresAt: periodEnd,
            isTrialing: false,
            trialLeadCap: null,
          },
        });

        await InvoiceService.createFromPayment({
          organizationId: org.id,
          planName: planDef?.name || `${org.plan} Plan Renewal`,
          amount: amountPaid,
          razorpayPaymentId: paymentObj?.id || null,
          billingPeriodStart: new Date(),
          billingPeriodEnd: periodEnd,
        });

        if (ownerUser) {
          await emailQueue.add({
            to: ownerUser.email,
            template: 'payment_receipt',
            variables: {
              companyName: org.name,
              amount: String(amountPaid),
              planName: `${planDef?.name || org.plan} Plan Renewal`,
              transactionId: paymentObj?.id || razorpaySubId,
            },
          });
        }
        break;
      }

      case 'subscription.halted':
        await prisma.organization.update({
          where: { id: org.id },
          data: { aiCallerEnabled: false },
        });
        break;

      case 'subscription.cancelled': {
        const starterPlan = await prisma.planDefinition.findUnique({ where: { slug: 'STARTER' } });
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            plan: 'STARTER',
            planDefinitionId: starterPlan?.id || null,
            aiCallsLimit: starterPlan?.maxAiCalls || 500,
            aiCallsUsed: 0,
            whatsappMsgLimit: starterPlan?.maxWhatsappMsg || 200,
            whatsappMsgUsed: 0,
            isTrialing: false,
            trialLeadCap: null,
            razorpaySubId: null,
          },
        });
        break;
      }

      default:
        logger.info(`Unhandled Razorpay Event: ${eventType}`);
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Razorpay Webhook handler error:', error.message);
    res.sendStatus(500);
  }
});

module.exports = router;
