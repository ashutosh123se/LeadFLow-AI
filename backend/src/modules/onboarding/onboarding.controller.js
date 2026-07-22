const OnboardingService = require('./onboarding.service');
const AuditService = require('../audit/audit.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getStatus = asyncHandler(async (req, res) => {
  const status = await OnboardingService.getStatus(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, status, 'Onboarding status fetched successfully.')
  );
});

const completeStep = asyncHandler(async (req, res) => {
  const stepNumber = parseInt(req.params.step, 10);
  const reqContext = AuditService.contextFromRequest(req);
  const status = await OnboardingService.completeStep(req.organizationId, stepNumber, req.body, reqContext);
  res.status(200).json(
    new ApiResponse(200, status, `Onboarding step ${stepNumber} completed.`)
  );
});

const skipOnboarding = asyncHandler(async (req, res) => {
  const result = await OnboardingService.skipOnboarding(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, result, 'Onboarding skipped.')
  );
});

module.exports = { getStatus, completeStep, skipOnboarding };
