const AuthService = require('./auth.service');
const AuditService = require('../audit/audit.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const reqContext = AuditService.contextFromRequest(req);
  const result = await AuthService.register(req.body, reqContext);
  res.status(201).json(
    new ApiResponse(201, result, 'Account created. Please verify your email to activate all features.')
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const reqContext = {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
    deviceName: req.body.deviceName || null,
  };
  const result = await AuthService.login(email, password, reqContext);
  res.status(200).json(
    new ApiResponse(200, result, 'Logged in successfully.')
  );
});

const logout = asyncHandler(async (req, res) => {
  const sessionId = req.body.sessionId || null;
  await AuthService.logout(req.user.id, sessionId);
  res.status(200).json(
    new ApiResponse(200, null, 'Logged out successfully.')
  );
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await AuthService.refreshToken(refreshToken);
  res.status(200).json(
    new ApiResponse(200, result, 'Token refreshed successfully.')
  );
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, { user: req.user }, 'Current user profile fetched successfully.')
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, token } = req.body;
  const result = await AuthService.verifyEmail(email, token);
  const message = result.alreadyVerified
    ? 'Email is already verified.'
    : 'Email verified successfully. Your account is now fully active.';
  res.status(200).json(
    new ApiResponse(200, result, message)
  );
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await AuthService.resendVerification(email);
  res.status(200).json(
    new ApiResponse(200, null, 'If the email exists and is unverified, a new verification link has been sent.')
  );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await AuthService.forgotPassword(email);
  res.status(200).json(
    new ApiResponse(200, null, 'If the email exists, an OTP has been sent.')
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  await AuthService.resetPassword(email, otp, newPassword);
  res.status(200).json(
    new ApiResponse(200, null, 'Password has been reset successfully. Please login with your new password.')
  );
});

const invite = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const reqContext = AuditService.contextFromRequest(req);
  await AuthService.inviteUser(req.organizationId, req.user.id, email, role, reqContext);
  res.status(200).json(
    new ApiResponse(200, null, `Invitation successfully sent to ${email}.`)
  );
});

const acceptInvite = asyncHandler(async (req, res) => {
  const { token, name, password, phone } = req.body;
  const user = await AuthService.acceptInvite(token, name, password, phone);
  res.status(201).json(
    new ApiResponse(201, user, 'Invitation accepted and account created successfully.')
  );
});

// Session management
const getSessions = asyncHandler(async (req, res) => {
  const sessions = await AuthService.getSessions(req.user.id);
  res.status(200).json(
    new ApiResponse(200, sessions, 'Active sessions fetched successfully.')
  );
});

const revokeSession = asyncHandler(async (req, res) => {
  await AuthService.revokeSession(req.user.id, req.params.sessionId);
  res.status(200).json(
    new ApiResponse(200, null, 'Session revoked successfully.')
  );
});

const revokeAllSessions = asyncHandler(async (req, res) => {
  const currentSessionId = req.body.currentSessionId || null;
  await AuthService.revokeAllSessions(req.user.id, currentSessionId);
  res.status(200).json(
    new ApiResponse(200, null, 'All other sessions revoked successfully.')
  );
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  invite,
  acceptInvite,
  getSessions,
  revokeSession,
  revokeAllSessions,
};
