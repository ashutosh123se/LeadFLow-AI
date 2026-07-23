const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/db');
const { verifyHmacSha256 } = require('../utils/webhookSignature');

const publicTenantResolver = async (req, res, next) => {
  try {
    const captureToken = req.params.captureToken || req.params.orgToken;

    if (!captureToken) {
      throw new ApiError(400, 'Capture token is required.');
    }

    const organization = await prisma.organization.findFirst({
      where: {
        captureToken,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!organization) {
      throw new ApiError(404, 'Invalid capture token or organization is inactive.');
    }

    const signatureResult = verifyHmacSha256(req, organization.captureToken, 'x-leadflow-signature');
    if (!signatureResult.ok) {
      throw new ApiError(401, signatureResult.message || 'Invalid capture request signature.');
    }

    req.organizationId = organization.id;
    req.organization = organization;
    next();
  } catch (error) {
    next(error);
  }
};

const generateCaptureToken = () => crypto.randomBytes(32).toString('hex');

module.exports = publicTenantResolver;
module.exports.generateCaptureToken = generateCaptureToken;
