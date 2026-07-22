const express = require('express');
const router = express.Router();

const {
  registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
  inviteSchema, acceptInviteSchema, verifyEmailSchema, resendVerificationSchema,
} = require('./auth.schema');

const {
  register, login, logout, refreshToken, getMe,
  verifyEmail, resendVerification, forgotPassword, resetPassword,
  invite, acceptInvite, getSessions, revokeSession, revokeAllSessions,
} = require('./auth.controller');

const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const authorize = require('../../middleware/rbac');
const { authLimiter } = require('../../middleware/rateLimiter');

// ─── Public routes ──────────────────────────────────────────────────────────
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-token', authLimiter, refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/accept-invite', authLimiter, validate(acceptInviteSchema), acceptInvite);

// ─── Email verification (public — user may not have a valid session yet) ────
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), resendVerification);

// ─── Authenticated routes ───────────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// ─── Session management ─────────────────────────────────────────────────────
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:sessionId', authenticate, revokeSession);
router.post('/sessions/revoke-all', authenticate, revokeAllSessions);

// ─── Admin-only invitation routes ───────────────────────────────────────────
router.post('/invite', authenticate, authorize(['OWNER', 'ADMIN']), validate(inviteSchema), invite);

module.exports = router;
