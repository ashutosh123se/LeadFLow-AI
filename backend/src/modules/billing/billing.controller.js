const BillingService = require('./billing.service');
const AuditService = require('../audit/audit.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getPlans = asyncHandler(async (req, res) => {
  const plans = await BillingService.getPlans();
  res.status(200).json(
    new ApiResponse(200, plans, 'Subscription plans fetched successfully.')
  );
});

const getCurrentUsage = asyncHandler(async (req, res) => {
  const usage = await BillingService.getCurrentPlanUsage(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, usage, 'Current plan usage fetched successfully.')
  );
});

const subscribe = asyncHandler(async (req, res) => {
  const { planSlug, billingInterval } = req.body;
  const reqContext = AuditService.contextFromRequest(req);
  const subscription = await BillingService.createSubscription(
    req.organizationId,
    planSlug,
    billingInterval || 'monthly',
    reqContext
  );
  res.status(200).json(
    new ApiResponse(200, subscription, 'Subscription initiated successfully.')
  );
});

const changePlan = asyncHandler(async (req, res) => {
  const { planSlug, billingInterval } = req.body;
  const reqContext = AuditService.contextFromRequest(req);
  const result = await BillingService.changePlan(
    req.organizationId,
    planSlug,
    billingInterval || 'monthly',
    reqContext
  );
  res.status(200).json(
    new ApiResponse(200, result, result.isUpgrade ? 'Plan upgraded successfully.' : 'Plan downgraded successfully.')
  );
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const reqContext = AuditService.contextFromRequest(req);
  await BillingService.cancelSubscription(req.organizationId, reqContext);
  res.status(200).json(
    new ApiResponse(200, null, 'Subscription cancelled. Downgraded to Starter plan.')
  );
});

const getInvoices = asyncHandler(async (req, res) => {
  const { limit, skip } = req.query;
  const invoices = await BillingService.getInvoices(req.organizationId, {
    limit: parseInt(limit) || 20,
    skip: parseInt(skip) || 0,
  });
  res.status(200).json(
    new ApiResponse(200, invoices, 'Invoice history fetched successfully.')
  );
});

const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const history = await BillingService.getSubscriptionHistory(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, history, 'Subscription history fetched successfully.')
  );
});

module.exports = {
  getPlans,
  getCurrentUsage,
  subscribe,
  changePlan,
  cancelSubscription,
  getInvoices,
  getSubscriptionHistory,
};
