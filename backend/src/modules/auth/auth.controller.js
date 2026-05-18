const AuthService = require('./auth.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  res.status(201).json(
    new ApiResponse(201, result, 'User and Organization registered successfully.')
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  res.status(200).json(
    new ApiResponse(200, result, 'Logged in successfully.')
  );
});

const logout = asyncHandler(async (req, res) => {
  await AuthService.logout(req.user.id);
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
    new ApiResponse(200, null, 'Password has been reset successfully.')
  );
});

const invite = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  await AuthService.inviteUser(req.organizationId, req.user.id, email, role);
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

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  invite,
  acceptInvite,
};
