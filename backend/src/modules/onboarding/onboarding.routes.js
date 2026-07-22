const express = require('express');
const router = express.Router();

const { getStatus, completeStep, skipOnboarding } = require('./onboarding.controller');
const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

router.use(authenticate);

router.get('/status', getStatus);
router.post('/step/:step', authorize(['OWNER', 'ADMIN']), completeStep);
router.post('/skip', authorize(['OWNER']), skipOnboarding);

module.exports = router;
