const PipelineService = require('./pipeline.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getPipelines = asyncHandler(async (req, res) => {
  const pipelines = await PipelineService.getPipelines(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, pipelines, 'Pipelines fetched successfully.')
  );
});

const getKanbanBoard = asyncHandler(async (req, res) => {
  const board = await PipelineService.getKanbanBoard(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, board, 'Kanban board stages and leads fetched successfully.')
  );
});

const createStage = asyncHandler(async (req, res) => {
  const { pipelineId } = req.body;
  const stage = await PipelineService.createStage(req.organizationId, pipelineId, req.body);
  res.status(201).json(
    new ApiResponse(201, stage, 'Pipeline stage created successfully.')
  );
});

const updateStage = asyncHandler(async (req, res) => {
  const stage = await PipelineService.updateStage(req.organizationId, req.params.id, req.body);
  res.status(200).json(
    new ApiResponse(200, stage, 'Pipeline stage updated successfully.')
  );
});

const deleteStage = asyncHandler(async (req, res) => {
  await PipelineService.deleteStage(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, null, 'Pipeline stage deleted successfully.')
  );
});

const moveLeadStage = asyncHandler(async (req, res) => {
  const { stageId } = req.body;
  const lead = await PipelineService.moveLead(req.organizationId, req.params.id, stageId);
  res.status(200).json(
    new ApiResponse(200, lead, 'Lead pipeline stage updated successfully.')
  );
});

module.exports = {
  getPipelines,
  getKanbanBoard,
  createStage,
  updateStage,
  deleteStage,
  moveLeadStage,
};
