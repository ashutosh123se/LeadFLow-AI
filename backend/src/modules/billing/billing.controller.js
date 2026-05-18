const BillingService = require('./billing.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getPlans = asyncHandler(async (req, res) => {
  const plans = BillingService.getPlans();
  res.status(200).json(
    new ApiResponse(200, plans, 'Pricing subscription plans fetched successfully.')
  );
});

const subscribe = asyncHandler(async (req, res) => {
  const { planId } = req.body;
  const subscription = await BillingService.createSubscription(req.organizationId, planId);
  res.status(200).json(
    new ApiResponse(200, subscription, 'Subscription transaction successfully initiated.')
  );
});

const cancelSubscription = asyncHandler(async (req, res) => {
  await BillingService.cancelSubscription(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, null, 'Active subscription cancelled successfully.')
  );
});

const getInvoices = asyncHandler(async (req, res) => {
  const invoices = await BillingService.getInvoices(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, invoices, 'Billing subscription invoice history fetched successfully.')
  );
});

module.exports = {
  getPlans,
  subscribe,
  cancelSubscription,
  getInvoices,
};
