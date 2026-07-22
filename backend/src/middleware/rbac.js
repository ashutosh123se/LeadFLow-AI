const ApiError = require('../utils/ApiError');

/**
 * Role hierarchy (higher number = more permissions):
 * SUPER_ADMIN: 100 — platform-level admin (can do everything)
 * OWNER: 90 — full access to their organization including billing/deletion
 * ADMIN: 70 — full access except billing/org deletion
 * MANAGER: 50 — can manage team and their team's leads
 * AGENT: 30 — can only manage leads assigned to them
 * VIEWER: 10 — read-only access
 */
const ROLE_HIERARCHY = {
  SUPER_ADMIN: 100,
  OWNER: 90,
  ADMIN: 70,
  MANAGER: 50,
  AGENT: 30,
  VIEWER: 10,
};

/**
 * Checks if the user role matches one of the allowed roles.
 * @param {string[]} allowedRoles - Array of allowed role names
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Unauthorized. Please authenticate first.');
      }

      const { role } = req.user;

      // SUPER_ADMIN bypasses all role checks
      if (role === 'SUPER_ADMIN') {
        return next();
      }

      if (!allowedRoles.includes(role)) {
        throw new ApiError(403, 'Forbidden. You do not have permission to access this resource.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Checks if the user has at least the specified minimum role level.
 * Uses the role hierarchy for comparison.
 * @param {string} minRole - Minimum required role
 */
const authorizeMinLevel = (minRole) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Unauthorized. Please authenticate first.');
      }

      const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
      const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

      if (userLevel < requiredLevel) {
        throw new ApiError(403, 'Forbidden. Insufficient role permissions.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Data-level authorization for agents: ensures agents can only access
 * leads assigned to them. Must be used after tenantResolver.
 * For Managers and above, all leads in the org are accessible.
 */
const authorizeLeadAccess = (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized.');
    }

    // Owners, Admins, Managers can access all leads
    if (['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER'].includes(req.user.role)) {
      return next();
    }

    // For AGENT role: we'll set a flag that services should use to filter
    if (req.user.role === 'AGENT') {
      req.agentLeadFilter = { assignedToId: req.user.id };
    }

    // VIEWER: read-only, same filter as agent for now
    if (req.user.role === 'VIEWER') {
      req.agentLeadFilter = { assignedToId: req.user.id };
      req.isReadOnly = true;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Blocks write operations for VIEWER role
 */
const blockViewerWrite = (req, res, next) => {
  if (req.user?.role === 'VIEWER') {
    return next(new ApiError(403, 'Viewer accounts have read-only access.'));
  }
  next();
};

module.exports = authorize;
module.exports.authorize = authorize;
module.exports.authorizeMinLevel = authorizeMinLevel;
module.exports.authorizeLeadAccess = authorizeLeadAccess;
module.exports.blockViewerWrite = blockViewerWrite;
module.exports.ROLE_HIERARCHY = ROLE_HIERARCHY;
