const express = require('express');
const router = express.Router();

const { createLeadSchema, updateLeadSchema, assignLeadSchema, createNoteSchema } = require('./lead.schema');
const { getLeads, getLead, createLead, updateLead, deleteLead, importCSV, assignLead, triggerCall, addNote, getTimeline } = require('./lead.controller');

const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const { authorize, authorizeLeadAccess, blockViewerWrite } = require('../../middleware/rbac');

router.use(authenticate);
router.use(authorizeLeadAccess);

router.get('/', getLeads);
router.get('/:id', getLead);
router.get('/:id/timeline', getTimeline);

router.post('/', blockViewerWrite, validate(createLeadSchema), createLead);
router.patch('/:id', blockViewerWrite, validate(updateLeadSchema), updateLead);
router.post('/:id/call', blockViewerWrite, authorize(['OWNER', 'ADMIN', 'MANAGER', 'AGENT']), triggerCall);
router.post('/:id/notes', blockViewerWrite, validate(createNoteSchema), addNote);

router.delete('/:id', authorize(['OWNER', 'ADMIN']), deleteLead);
router.post('/import', authorize(['OWNER', 'ADMIN', 'MANAGER']), importCSV);
router.post('/:id/assign', authorize(['OWNER', 'ADMIN', 'MANAGER']), validate(assignLeadSchema), assignLead);

module.exports = router;
