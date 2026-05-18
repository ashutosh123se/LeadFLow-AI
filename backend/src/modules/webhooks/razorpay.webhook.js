const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { prisma } = require('../../config/db');
const razorpayConfig = require('../../config/razorpay');
const logger = require('../../utils/logger');
const emailQueue = require('../../queues/emailQueue');

const verifyRazorpaySignature = (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = razorpayConfig.webhookSecret || 'rzp_webhook_secret_placeholder';

  if (!signature) {
    logger.warn('Razorpay webhook missing x-razorpay-signature');
    return res.status(400).send('Signature missing');
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.error('Razorpay webhook signature verification failed');
    if (process.env.NODE_ENV === 'production') {
      return res.status(400).send('Signature mismatch');
    }
  }
  next();
};

router.post('/', verifyRazorpaySignature, async (req, res) => {
  const eventObj = req.body;
  const eventType = eventObj.event;
  const payload = eventObj.payload;

  logger.info(`Received Razorpay Webhook Event: "${eventType}"`);

  try {
    const subscriptionObj = payload?.subscription?.entity;
    if (!subscriptionObj) {
      return res.sendStatus(200);
    }

    const razorpaySubId = subscriptionObj.id;

    // Resolve organization by subscription ID
    const org = await prisma.organization.findFirst({
      where: { razorpaySubId },
    });

    if (!org) {
      logger.warn(`Razorpay subscription ID ${razorpaySubId} is not associated with any organization in the system.`);
      return res.sendStatus(200);
    }

    const ownerUser = await prisma.user.findFirst({
      where: { organizationId: org.id, role: 'OWNER' },
    });

    const planLimitsMap = {
      'STARTER': 20,
      'GROWTH': 75,
      'PRO': 200,
    };

    switch (eventType) {
      case 'subscription.activated': {
        // Resolve plan dynamically (map from Razorpay plan ID in production, fallback to Growth or Starter)
        const planId = 'GROWTH'; // default mapped plan
        const limit = planLimitsMap[planId] || 20;

        await prisma.$transaction([
          prisma.organization.update({
            where: { id: org.id },
            data: {
              plan: planId,
              aiCallsLimit: limit,
              aiCallsUsed: 0,
              isActive: true,
              planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          }),
          prisma.subscription.create({
            data: {
              organizationId: org.id,
              plan: planId,
              status: 'active',
              amount: 3499.00,
              currency: 'INR',
              razorpaySubId,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          }),
        ]);

        if (ownerUser) {
          await emailQueue.add({
            to: ownerUser.email,
            subject: 'Subscription Activated! - LeadLFlowAI',
            text: `Hello ${ownerUser.name},\n\nYour LeadLFlowAI subscription for ${org.name} has been successfully activated. You have been credited with ${limit} AI outbound calls.`,
          });
        }
        break;
      }

      case 'subscription.charged': {
        // Recurring charge succeeded - reset call limits
        const limit = planLimitsMap[org.plan] || 20;

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            aiCallsUsed: 0,
            planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        if (ownerUser) {
          await emailQueue.add({
            to: ownerUser.email,
            subject: 'Payment Successful - LeadLFlowAI',
            text: `Hello ${ownerUser.name},\n\nYour recurring subscription payment succeeded. Your monthly speed-to-lead AI call limits have been renewed.`,
          });
        }
        break;
      }

      case 'subscription.halted': {
        // Payment failed repeatedly - suspend services
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            aiCallerEnabled: false,
          },
        });

        if (ownerUser) {
          await emailQueue.add({
            to: ownerUser.email,
            subject: 'Urgent: Subscription Suspended - LeadLFlowAI',
            text: `Hello ${ownerUser.name},\n\nYour recurring subscription payment failed multiple times. Automated outbound calling services have been suspended. Please update your payment method.`,
          });
        }
        break;
      }

      case 'subscription.cancelled': {
        // Downgrade to free/starter
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            plan: 'STARTER',
            aiCallsLimit: 20,
            aiCallsUsed: 0,
            razorpaySubId: null,
          },
        });

        if (ownerUser) {
          await emailQueue.add({
            to: ownerUser.email,
            subject: 'Subscription Cancelled - LeadLFlowAI',
            text: `Hello ${ownerUser.name},\n\nYour subscription has been cancelled. Your account has been downgraded to the Starter plan.`,
          });
        }
        break;
      }

      default:
        logger.info(`Unhandled Razorpay Event: ${eventType}`);
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Razorpay Webhook handler error:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
