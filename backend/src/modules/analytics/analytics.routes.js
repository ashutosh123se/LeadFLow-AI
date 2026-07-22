const express = require('express');
const router = express.Router();

const { getOverview, getLeadsAnalytics, getSourcesAnalytics, getPipelineAnalytics, getCallsAnalytics, getTeamAnalytics, getResponseTimeAnalytics } = require('./analytics.controller');

const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

router.get('/overview', getOverview);
router.get('/leads', getLeadsAnalytics);
router.get('/sources', getSourcesAnalytics);
router.get('/pipeline', getPipelineAnalytics);
router.get('/calls', getCallsAnalytics);
router.get('/response-time', getResponseTimeAnalytics);

// Team detailed leaderboards (Managers / Owners)
router.get('/team', authorize(['OWNER', 'ADMIN', 'MANAGER']), getTeamAnalytics);

module.exports = router;
