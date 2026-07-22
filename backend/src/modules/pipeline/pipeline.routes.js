const express = require('express');
const router = express.Router();

const { getPipelines, getKanbanBoard, createStage, updateStage, deleteStage, moveLeadStage } = require('./pipeline.controller');

const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

router.get('/', getPipelines);
router.get('/board', getKanbanBoard);

// Admin-level stage updates
router.post('/stages', authorize(['OWNER', 'ADMIN']), createStage);
router.patch('/stages/:id', authorize(['OWNER', 'ADMIN']), updateStage);
router.delete('/stages/:id', authorize(['OWNER', 'ADMIN']), deleteStage);

// Lead drag-and-drop movement
router.patch('/leads/:id/stage', moveLeadStage);

module.exports = router;
