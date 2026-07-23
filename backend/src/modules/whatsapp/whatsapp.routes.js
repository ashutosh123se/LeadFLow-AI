const express = require('express');
const router = express.Router();

const { getConversations, getMessages, sendMessage, getTemplates } = require('./whatsapp.controller');
const authenticate = require('../../middleware/auth');
const { authorize, blockViewerWrite } = require('../../middleware/rbac');

router.use(authenticate);

router.get('/conversations', getConversations);
router.get('/conversations/:leadId', getMessages);
router.get('/templates', getTemplates);
router.post('/send', blockViewerWrite, authorize(['OWNER', 'ADMIN', 'MANAGER', 'AGENT']), sendMessage);

module.exports = router;
