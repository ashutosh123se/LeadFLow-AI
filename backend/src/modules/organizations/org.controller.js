const OrgService = require('./org.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getOrgDetails = asyncHandler(async (req, res) => {
  const org = await OrgService.getOrg(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, org, 'Organization details fetched successfully.')
  );
});

const updateOrgDetails = asyncHandler(async (req, res) => {
  const org = await OrgService.updateOrg(req.organizationId, req.body);
  res.status(200).json(
    new ApiResponse(200, org, 'Organization details updated successfully.')
  );
});

const updateAiCallerSettings = asyncHandler(async (req, res) => {
  const org = await OrgService.updateAiCallerSettings(req.organizationId, req.body);
  res.status(200).json(
    new ApiResponse(200, org, 'AI caller settings updated successfully.')
  );
});

const updateWhatsappSettings = asyncHandler(async (req, res) => {
  const org = await OrgService.updateWhatsappSettings(req.organizationId, req.body);
  res.status(200).json(
    new ApiResponse(200, org, 'WhatsApp settings updated successfully.')
  );
});

const getUsageStats = asyncHandler(async (req, res) => {
  const stats = await OrgService.getUsage(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, stats, 'Organization usage stats fetched successfully.')
  );
});

module.exports = {
  getOrgDetails,
  updateOrgDetails,
  updateAiCallerSettings,
  updateWhatsappSettings,
  getUsageStats,
};
