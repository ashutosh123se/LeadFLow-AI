const express = require('express');
const router = express.Router();

const { getOrgDetails, updateOrgDetails, updateAiCallerSettings, updateWhatsappSettings, getUsageStats } = require('./org.controller');

const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

router.get('/', getOrgDetails);
router.patch('/', authorize(['OWNER', 'ADMIN']), updateOrgDetails);
router.patch('/ai-caller', authorize(['OWNER', 'ADMIN']), updateAiCallerSettings);
router.patch('/whatsapp', authorize(['OWNER', 'ADMIN']), updateWhatsappSettings);
router.get('/usage', getUsageStats);

module.exports = router;
