const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const PlatformService = require('./platform.service');

const getStats = asyncHandler(async (req, res) => {
  const stats = await PlatformService.getStats();
  res.json(new ApiResponse(200, stats, 'Platform stats fetched.'));
});

const listOrganizations = asyncHandler(async (req, res) => {
  const orgs = await PlatformService.listOrganizations();
  res.json(new ApiResponse(200, orgs, 'Organizations fetched.'));
});

const suspendOrganization = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  await PlatformService.suspendOrganization(req.params.id, reason, {
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json(new ApiResponse(200, null, 'Organization suspended.'));
});

const reactivateOrganization = asyncHandler(async (req, res) => {
  await PlatformService.reactivateOrganization(req.params.id, {
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json(new ApiResponse(200, null, 'Organization reactivated.'));
});

module.exports = {
  getStats,
  listOrganizations,
  suspendOrganization,
  reactivateOrganization,
};
