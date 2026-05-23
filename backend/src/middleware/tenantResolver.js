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
    throw new ApiError(401, 'Invalid token payload');
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { organization: true }
  });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found or inactive');
  }
  if (!user.organization || !user.organization.isActive) {
    throw new ApiError(403, 'Organization suspended or inactive');
  }
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    organization: user.organization
  };
  req.organizationId = user.organizationId;
  next();
});

module.exports = tenantResolver;
