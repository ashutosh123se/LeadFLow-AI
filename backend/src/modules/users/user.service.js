const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

class UserService {
  static async getAll(orgId) {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return users;
  }

  static async getById(orgId, userId) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: orgId,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    return user;
  }

  static async updateRole(orgId, currentUserId, targetUserId, newRole) {
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: orgId },
    });

    if (!targetUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (targetUser.role === 'OWNER') {
      throw new ApiError(400, 'Cannot change the role of the organization owner.');
    }

    const updated = await prisma.user.update({
      where: {
        id: targetUserId,
        organizationId: orgId, // redundant but extra precaution
      },
      data: {
        role: newRole,
      },
    });

    return updated;
  }

  static async deleteUser(orgId, currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
      throw new ApiError(400, 'You cannot delete your own account.');
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: orgId },
    });

    if (!targetUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (targetUser.role === 'OWNER') {
      throw new ApiError(400, 'Cannot delete the organization owner.');
    }

    // Soft delete user by setting isActive to false
    const updated = await prisma.user.update({
      where: {
        id: targetUserId,
        organizationId: orgId,
      },
      data: {
        isActive: false,
      },
    });

    return updated;
  }

  static async updateProfile(orgId, userId, data) {
    const { name, phone, avatar, password } = data;

    const updateData = {
      name,
      phone,
      avatar,
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
      },
    });

    return updated;
  }
}

module.exports = UserService;
