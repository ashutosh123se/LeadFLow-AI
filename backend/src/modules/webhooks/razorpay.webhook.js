const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { prisma } = require('../../config/db');
const razorpayConfig = require('../../config/razorpay');
const logger = require('../../utils/logger');
const emailQueue = require('../../queues/emailQueue');

const verifyRazorpaySignature = (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = razorpayConfig.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature) {
    logger.warn('Razorpay webhook missing x-razorpay-signature');
    return res.status(400).send('Signature missing');
  }

  const payload = req.rawBody ? req.rawBody : JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
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
            template: 'payment_receipt',
            variables: {
              companyName: org.name,
              amount: '3499.00',
              planName: 'Growth Plan',
              transactionId: razorpaySubId
            }
          });
        }
        break;
      }

      case 'subscription.charged': {
        const limit = planLimitsMap[org.plan] || 20;
        const amountPaid = subscriptionObj.paid_count > 0 ? '3499.00' : '0.00';

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
            template: 'payment_receipt',
            variables: {
              companyName: org.name,
              amount: amountPaid,
              planName: `${org.plan} Plan Renewal`,
              transactionId: `renew-${razorpaySubId}-${Date.now()}`
            }
          });
        }
        break;
      }

      case 'subscription.halted': {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            aiCallerEnabled: false,
          },
        });

        if (ownerUser) {
          await emailQueue.add({
            to: ownerUser.email,
            subject: 'Subscription Halted - Action Required',
            text: `Hello ${ownerUser.name},\n\nYour Razorpay subscription payment failed multiple times. Your outbound calling services have been suspended. Please log in and resolve your subscription billing.`,
            html: `<h3>Payment Failed - Subscription Halted</h3><p>Hello ${ownerUser.name},</p><p>We tried to charge your payment method for subscription <strong>${razorpaySubId}</strong>, but it failed multiple times. Your LeadFlow-AI outbound calling services are suspended.</p><p>Please update your billing credentials on the dashboard.</p>`
          });
        }
        break;
      }

      case 'subscription.cancelled': {
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
            subject: 'LeadFlow-AI Subscription Cancelled',
            text: `Hello ${ownerUser.name},\n\nYour premium subscription has been cancelled and downgraded to the Starter tier.`,
            html: `<h3>Subscription Downgraded</h3><p>Hello ${ownerUser.name},</p><p>Your subscription has been cancelled. Your workspace limits have been downgraded to the Starter tier (20 free call qualification limit).</p>`
          });
        }
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
