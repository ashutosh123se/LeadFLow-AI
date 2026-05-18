const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      throw new ApiError(401, 'Access token is invalid or expired.');
    }

    // Fetch user and organization status to ensure they are active
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        organizationId: decoded.organizationId,
        isActive: true,
      },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new ApiError(401, 'User account is inactive or does not exist.');
    }

    if (!user.organization || !user.organization.isActive) {
      throw new ApiError(403, 'Organization account is inactive. Please contact support.');
    }

    // Attach to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    req.organizationId = user.organizationId;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
