const express = require('express');
const router = express.Router();

const { getAutomations, getAutomationDetails, createAutomation, updateAutomation, deleteAutomation, toggleAutomation } = require('./automation.controller');

const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

router.get('/', getAutomations);
router.get('/:id', getAutomationDetails);

// Admin-only CRUD actions
router.post('/', authorize(['OWNER', 'ADMIN']), createAutomation);
router.patch('/:id', authorize(['OWNER', 'ADMIN']), updateAutomation);
router.delete('/:id', authorize(['OWNER', 'ADMIN']), deleteAutomation);
router.post('/:id/toggle', authorize(['OWNER', 'ADMIN']), toggleAutomation);

module.exports = router;
