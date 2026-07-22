const AnalyticsService = require('./analytics.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getOverview = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.getOverview(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, data, 'Overview stats fetched successfully.')
  );
});

const getLeadsAnalytics = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.getLeadStats(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, data, 'Lead volume stats fetched successfully.')
  );
});

const getSourcesAnalytics = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.getSources(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, data, 'Lead source breakdown fetched successfully.')
  );
});

const getPipelineAnalytics = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.getPipelineFunnel(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, data, 'Pipeline funnel breakdown fetched successfully.')
  );
});

const getCallsAnalytics = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.getCallsBreakdown(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, data, 'Call log status breakdown fetched successfully.')
  );
});

const getTeamAnalytics = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.getTeamPerformance(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, data, 'Team performance analytics fetched successfully.')
  );
});

const getResponseTimeAnalytics = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.getResponseTime(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, data, 'Avg response time analytics fetched successfully.')
  );
});

module.exports = {
  getOverview,
  getLeadsAnalytics,
  getSourcesAnalytics,
  getPipelineAnalytics,
  getCallsAnalytics,
  getTeamAnalytics,
  getResponseTimeAnalytics,
};
