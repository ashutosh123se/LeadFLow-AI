const express = require('express');
const router = express.Router();

const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, inviteSchema, acceptInviteSchema } = require('./auth.schema');
const { register, login, logout, refreshToken, getMe, forgotPassword, resetPassword, invite, acceptInvite } = require('./auth.controller');

const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');
const { authLimiter, apiLimiter } = require('../../middleware/rateLimiter');

// Public routes
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-token', authLimiter, refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/accept-invite', authLimiter, validate(acceptInviteSchema), acceptInvite);

// Authenticated routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// Admin-only invitation routes
router.post('/invite', authenticate, authorize(['OWNER', 'ADMIN']), validate(inviteSchema), invite);

module.exports = router;
