const express = require('express');
const router = express.Router();

const { getIntegrations, connectIntegration, disconnectIntegration } = require('./integration.controller');

const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// List all integrations
router.get('/', getIntegrations);

// Connect endpoints per source
router.post('/indiamart', authorize(['OWNER', 'ADMIN']), (req, res, next) => {
  req.body.type = 'indiamart';
  next();
}, connectIntegration);

router.post('/justdial', authorize(['OWNER', 'ADMIN']), (req, res, next) => {
  req.body.type = 'justdial';
  next();
}, connectIntegration);

router.post('/facebook', authorize(['OWNER', 'ADMIN']), (req, res, next) => {
  req.body.type = 'facebook';
  next();
}, connectIntegration);

router.post('/zapier', authorize(['OWNER', 'ADMIN']), (req, res, next) => {
  req.body.type = 'zapier';
  next();
}, connectIntegration);

// Disconnect
router.delete('/:type', authorize(['OWNER', 'ADMIN']), disconnectIntegration);

module.exports = router;
