const CallService = require('./call.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

const getCalls = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query.page, req.query.limit);
  const { total, data } = await CallService.getAll(req.organizationId, { page, limit, skip });
  const meta = getPaginationMeta(total, page, limit);

  res.status(200).json(
    new ApiResponse(200, data, 'Call logs fetched successfully.', meta)
  );
});

const getCallDetails = asyncHandler(async (req, res) => {
  const call = await CallService.getById(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, call, 'Call log details fetched successfully.')
  );
});

const triggerCall = asyncHandler(async (req, res) => {
  const { leadId } = req.body;
  await CallService.triggerCall(req.organizationId, leadId);
  res.status(200).json(
    new ApiResponse(200, null, 'Outbound AI voice agent call queued.')
  );
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await CallService.getStats(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, stats, 'Call analytics stats fetched successfully.')
  );
});

module.exports = {
  getCalls,
  getCallDetails,
  triggerCall,
  getStats,
};
