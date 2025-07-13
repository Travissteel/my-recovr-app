const logger = require('./logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleDatabaseError = (err) => {
  logger.error('Database error:', { error: err.message, stack: err.stack });
  
  // PostgreSQL specific error handling
  if (err.code === '23505') {
    return new AppError('Duplicate field value. Please use another value.', 400);
  }
  
  if (err.code === '23503') {
    return new AppError('Referenced resource not found.', 404);
  }
  
  if (err.code === '23502') {
    return new AppError('Missing required field.', 400);
  }
  
  if (err.code === '22P02') {
    return new AppError('Invalid input format.', 400);
  }
  
  return new AppError('Database operation failed. Please try again.', 500);
};

const handleJWTError = (err) => {
  logger.security('JWT error:', { error: err.message });
  
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token. Please log in again.', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expired. Please log in again.', 401);
  }
  
  return new AppError('Authentication failed.', 401);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  return new AppError(`Invalid input data: ${errors.join('. ')}`, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    logger.error('Programming error:', { error: err.message, stack: err.stack });
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (error.code) {
    error = handleDatabaseError(error);
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    error = handleJWTError(error);
  } else if (error.name === 'ValidationError') {
    error = handleValidationError(error);
  }

  // Log all errors
  logger.error('Global error handler:', {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
    process.exit(1);
  });
};

const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', { error: err.message, stack: err.stack });
    process.exit(1);
  });
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  handleUncaughtException,
  handleUnhandledRejection
};