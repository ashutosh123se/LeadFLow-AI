const express = require('express');
const router = express.Router();

const { createLeadSchema, updateLeadSchema, assignLeadSchema, createNoteSchema } = require('./lead.schema');
const { getLeads, getLead, createLead, updateLead, deleteLead, importCSV, assignLead, triggerCall, addNote, getTimeline } = require('./lead.controller');

const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

router.get('/', getLeads);
router.get('/:id', getLead);
router.post('/', validate(createLeadSchema), createLead);
router.patch('/:id', validate(updateLeadSchema), updateLead);

// Manager / Admin routes
router.delete('/:id', authorize(['OWNER', 'ADMIN']), deleteLead);
router.post('/import', authorize(['OWNER', 'ADMIN', 'MANAGER']), importCSV);
router.post('/:id/assign', authorize(['OWNER', 'ADMIN', 'MANAGER']), validate(assignLeadSchema), assignLead);

// Custom lead trigger paths
router.post('/:id/call', triggerCall);
router.get('/:id/timeline', getTimeline);
router.post('/:id/notes', validate(createNoteSchema), addNote);

module.exports = router;
