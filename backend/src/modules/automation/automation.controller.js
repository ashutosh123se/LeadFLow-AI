const AutomationService = require('./automation.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getAutomations = asyncHandler(async (req, res) => {
  const automations = await AutomationService.getAll(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, automations, 'Automation workflows fetched successfully.')
  );
});

const getAutomationDetails = asyncHandler(async (req, res) => {
  const auto = await AutomationService.getById(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, auto, 'Automation workflow details fetched successfully.')
  );
});

const createAutomation = asyncHandler(async (req, res) => {
  const auto = await AutomationService.create(req.organizationId, req.body);
  res.status(201).json(
    new ApiResponse(201, auto, 'Automation workflow created successfully.')
  );
});

const updateAutomation = asyncHandler(async (req, res) => {
  const auto = await AutomationService.update(req.organizationId, req.params.id, req.body);
  res.status(200).json(
    new ApiResponse(200, auto, 'Automation workflow updated successfully.')
  );
});

const deleteAutomation = asyncHandler(async (req, res) => {
  await AutomationService.delete(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, null, 'Automation workflow deleted successfully.')
  );
});

const toggleAutomation = asyncHandler(async (req, res) => {
  const auto = await AutomationService.toggleActive(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, auto, `Automation workflow successfully ${auto.isActive ? 'activated' : 'deactivated'}.`)
  );
});

module.exports = {
  getAutomations,
  getAutomationDetails,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
};
