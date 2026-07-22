const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, err.errors || [], err.stack);
  }

  // Log error
  logger.error(error.message, {
    url: req.originalUrl,
    method: req.method,
    statusCode: error.statusCode,
    stack: error.stack,
    errors: error.errors,
  });

  const response = {
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  if (error.errors && error.errors.length > 0) {
    response.errors = error.errors;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
