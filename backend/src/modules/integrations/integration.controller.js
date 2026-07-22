const IntegrationService = require('./integration.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getIntegrations = asyncHandler(async (req, res) => {
  const catalog = await IntegrationService.getIntegrations(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, catalog, 'Integration catalog fetched successfully.')
  );
});

const connectIntegration = asyncHandler(async (req, res) => {
  const { type, config } = req.body;
  const integration = await IntegrationService.connect(req.organizationId, type, config);
  res.status(200).json(
    new ApiResponse(200, integration, `Connected to ${type} successfully.`)
  );
});

const disconnectIntegration = asyncHandler(async (req, res) => {
  const { type } = req.params;
  await IntegrationService.disconnect(req.organizationId, type);
  res.status(200).json(
    new ApiResponse(200, null, `Disconnected from ${type} successfully.`)
  );
});

module.exports = {
  getIntegrations,
  connectIntegration,
  disconnectIntegration,
};
