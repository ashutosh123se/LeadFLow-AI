const express = require('express');
const router = express.Router();

const { getCalls, getCallDetails, triggerCall, getStats } = require('./call.controller');

const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

router.get('/', getCalls);
router.get('/stats', authorize(['OWNER', 'ADMIN', 'MANAGER']), getStats);
router.get('/:id', getCallDetails);
router.post('/trigger', triggerCall);

module.exports = router;
