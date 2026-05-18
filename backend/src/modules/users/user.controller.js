const UserService = require('./user.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await UserService.getAll(req.organizationId);
  res.status(200).json(
    new ApiResponse(200, users, 'Team members fetched successfully.')
  );
});

const getUser = asyncHandler(async (req, res) => {
  const user = await UserService.getById(req.organizationId, req.params.id);
  res.status(200).json(
    new ApiResponse(200, user, 'User details fetched successfully.')
  );
});

const updateUserRole = asyncHandler(async (req, res) => {
  const user = await UserService.updateRole(
    req.organizationId,
    req.user.id,
    req.params.id,
    req.body.role
  );
  res.status(200).json(
    new ApiResponse(200, user, 'User role updated successfully.')
  );
});

const deleteUser = asyncHandler(async (req, res) => {
  await UserService.deleteUser(req.organizationId, req.user.id, req.params.id);
  res.status(200).json(
    new ApiResponse(200, null, 'User account deactivated successfully.')
  );
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await UserService.updateProfile(req.organizationId, req.user.id, req.body);
  res.status(200).json(
    new ApiResponse(200, user, 'Profile updated successfully.')
  );
});

module.exports = {
  getAllUsers,
  getUser,
  updateUserRole,
  deleteUser,
  updateProfile,
};
