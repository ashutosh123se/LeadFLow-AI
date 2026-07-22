const express = require('express');
const router = express.Router();

const { getConversations, getMessages, sendMessage, getTemplates } = require('./whatsapp.controller');

const authenticate = require('../../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/conversations', getConversations);
router.get('/conversations/:leadId', getMessages);
router.post('/send', sendMessage);
router.get('/templates', getTemplates);

module.exports = router;
