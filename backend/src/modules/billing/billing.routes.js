const express = require('express');
const router = express.Router();

const {
  getPlans, getCurrentUsage, subscribe, changePlan,
  cancelSubscription, getInvoices, getSubscriptionHistory,
} = require('./billing.controller');

const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// Public — pricing page
router.get('/plans', getPlans);

// Protected — requires authentication
router.use(authenticate);

// Usage & subscription info (any authenticated user can view)
router.get('/usage', getCurrentUsage);
router.get('/invoices', getInvoices);
router.get('/subscriptions', getSubscriptionHistory);

// Billing actions — Owner only
router.post('/subscribe', authorize(['OWNER']), subscribe);
router.post('/change-plan', authorize(['OWNER']), changePlan);
router.post('/cancel', authorize(['OWNER']), cancelSubscription);

module.exports = router;
