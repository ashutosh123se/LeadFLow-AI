const express = require('express');
const router = express.Router();

const authenticate = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const {
  getStats,
  listOrganizations,
  suspendOrganization,
  reactivateOrganization,
} = require('./platform.controller');

router.use(authenticate);
router.use(authorize(['SUPER_ADMIN']));

router.get('/stats', getStats);
router.get('/organizations', listOrganizations);
router.post('/organizations/:id/suspend', suspendOrganization);
router.post('/organizations/:id/reactivate', reactivateOrganization);

module.exports = router;
