const express = require('express');
const router = express.Router();

const { getPlans, subscribe, cancelSubscription, getInvoices } = require('./billing.controller');

const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// Public plans page is accessible without auth
router.get('/plans', getPlans);

// Protected checkout/billing routes
router.use(authenticate);

router.post('/subscribe', subscribe);
router.post('/cancel', authorize(['OWNER']), cancelSubscription);
router.get('/invoices', getInvoices);

module.exports = router;
