const LeadService = require('./lead.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

const getLeads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query.page, req.query.limit);
  const filters = {
    status: req.query.status,
    source: req.query.source,
    scoreLabel: req.query.scoreLabel,
    assignedToId: req.query.assignedTo,
    stageId: req.query.stage,
    search: req.query.search,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  };

  const { total, data } = await LeadService.getAll(req.organizationId, filters, { page, limit, skip });
  const meta = getPaginationMeta(total, page, limit);

  res.status(200).json(
    new ApiResponse(200, data, 'Leads fetched successfully.', meta)
  );
});

const getLead = asyncHandler(async (req, res) => {
  const lead = await LeadService.getById(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, lead, 'Lead details fetched successfully.')
  );
});

const createLead = asyncHandler(async (req, res) => {
  const lead = await LeadService.create(req.organizationId, req.body);
  res.status(201).json(
    new ApiResponse(201, lead, 'Lead created successfully.')
  );
});

const updateLead = asyncHandler(async (req, res) => {
  const lead = await LeadService.update(req.organizationId, req.params.id, req.body);
  res.status(200).json(
    new ApiResponse(200, lead, 'Lead updated successfully.')
  );
});

const deleteLead = asyncHandler(async (req, res) => {
  await LeadService.delete(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, null, 'Lead deleted successfully.')
  );
});

const importCSV = asyncHandler(async (req, res) => {
  const { leads } = req.body;
  const result = await LeadService.importCSV(req.organizationId, leads);
  res.status(200).json(
    new ApiResponse(200, result, 'CSV leads imported successfully.')
  );
});

const assignLead = asyncHandler(async (req, res) => {
  await LeadService.assign(req.organizationId, req.params.id, req.body.userId);
  res.status(200).json(
    new ApiResponse(200, null, 'Lead assignment updated successfully.')
  );
});

const triggerCall = asyncHandler(async (req, res) => {
  await LeadService.triggerCallManual(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, null, 'Manual AI outbound call queued successfully.')
  );
});

const addNote = asyncHandler(async (req, res) => {
  const note = await LeadService.addNote(req.organizationId, req.params.id, req.body.content);
  res.status(201).json(
    new ApiResponse(201, note, 'Note added successfully.')
  );
});

const getTimeline = asyncHandler(async (req, res) => {
  const timeline = await LeadService.getTimeline(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, timeline, 'Lead timeline activities fetched successfully.')
  );
});

module.exports = {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  importCSV,
  assignLead,
  triggerCall,
  addNote,
  getTimeline,
};
