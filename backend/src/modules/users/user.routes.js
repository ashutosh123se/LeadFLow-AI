const express = require('express');
const router = express.Router();

const { updateProfileSchema, updateRoleSchema } = require('./user.schema');
const { getAllUsers, getUser, updateUserRole, deleteUser, updateProfile } = require('./user.controller');

const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// Profile updates (any authenticated user)
router.patch('/profile', validate(updateProfileSchema), updateProfile);

// Admin-level team management routes
router.get('/', authorize(['OWNER', 'ADMIN', 'MANAGER']), getAllUsers);
router.get('/:id', authorize(['OWNER', 'ADMIN', 'MANAGER']), getUser);

// Owner-only dangerous actions
router.patch('/:id/role', authorize(['OWNER']), validate(updateRoleSchema), updateUserRole);
router.delete('/:id', authorize(['OWNER']), deleteUser);

module.exports = router;
