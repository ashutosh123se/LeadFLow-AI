const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/db');

const publicTenantResolver = async (req, res, next) => {
  try {
    const orgToken = req.params.orgToken || req.query.orgToken || req.headers['x-org-token'];

    if (!orgToken) {
      throw new ApiError(400, 'Organization token is required.');
    }

    // Find the organization by token (using ID or Slug)
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { id: orgToken },
          { slug: orgToken },
        ],
        isActive: true,
      },
    });

    if (!organization) {
      throw new ApiError(404, 'Organization not found or is currently inactive.');
    }

    req.organizationId = organization.id;
    req.organization = organization;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = publicTenantResolver;
