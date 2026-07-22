const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const tenantResolver = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'No token provided');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  if (!decoded || !decoded.userId) {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { organization: true },
  });

  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'Your account has been deactivated. Contact your organization administrator.');
  }

  if (!user.organization) {
    throw new ApiError(403, 'Organization not found');
  }

  // SUPER_ADMIN bypasses org suspension/deletion checks for platform org
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isPlatformOrg = user.organization.slug === 'leadflow-platform';

  if (!isSuperAdmin || !isPlatformOrg) {
    if (!user.organization.isActive) {
      throw new ApiError(403, 'Your organization is currently inactive.');
    }

    if (user.organization.suspendedAt) {
      throw new ApiError(403, `Your organization has been suspended. ${user.organization.suspendedReason ? `Reason: ${user.organization.suspendedReason}` : 'Contact support for assistance.'}`);
    }

    if (user.organization.deletedAt) {
      throw new ApiError(403, 'This organization account has been deleted.');
    }
  }

  // Set user context on request
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    organization: user.organization,
    emailVerified: user.emailVerified,
  };
  req.organizationId = user.organizationId;

  next();
});

module.exports = tenantResolver;
