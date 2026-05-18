const ApiError = require('../utils/ApiError');

// Checks if the user role matches one of the allowed roles
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Unauthorized. Please authenticate first.');
      }

      const { role } = req.user;

      if (!allowedRoles.includes(role)) {
        throw new ApiError(403, 'Forbidden. You do not have permission to access this resource.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorize;
