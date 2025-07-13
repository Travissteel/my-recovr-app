const SecurityAudit = require('../utils/securityAudit');

/**
 * Comprehensive Error Handling Middleware
 * Provides secure error responses that don't leak sensitive information
 */

class ErrorHandler {
  // Error types that should be logged as security events
  static SECURITY_ERRORS = new Set([
    'JsonWebTokenError',
    'TokenExpiredError',
    'UnauthorizedError',
    'ForbiddenError',
    'ValidationError',
    'CastError',
    'MongoError',
    'SequelizeValidationError',
    'SequelizeUniqueConstraintError'
  ]);

  // Error types that should not be logged (to prevent log spam)
  static SILENT_ERRORS = new Set([
    'AbortError', // Client disconnections
    'ECONNRESET',
    'EPIPE'
  ]);

  /**
   * Main error handling middleware
   */
  static handle(error, req, res, next) {
    // Extract error information
    const errorInfo = ErrorHandler.extractErrorInfo(error);
    
    // Log the error if necessary
    ErrorHandler.logError(error, req, errorInfo);
    
    // Send appropriate response
    ErrorHandler.sendErrorResponse(res, errorInfo, req);
  }

  /**
   * Extract relevant information from error object
   */
  static extractErrorInfo(error) {
    const info = {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      statusCode: error.statusCode || error.status || 500,
      code: error.code,
      stack: error.stack,
      isOperational: error.isOperational || false,
      severity: 'error'
    };

    // Determine error severity
    if (info.statusCode >= 500) {
      info.severity = 'critical';
    } else if (info.statusCode >= 400) {
      info.severity = 'warning';
    } else {
      info.severity = 'info';
    }

    // Mark security-related errors
    if (ErrorHandler.SECURITY_ERRORS.has(info.name)) {
      info.isSecurityRelated = true;
      info.severity = 'critical';
    }

    return info;
  }

  /**
   * Log error with appropriate level and context
   */
  static logError(error, req, errorInfo) {
    // Skip logging for silent errors
    if (ErrorHandler.SILENT_ERRORS.has(errorInfo.name) || 
        ErrorHandler.SILENT_ERRORS.has(errorInfo.code)) {
      return;
    }

    // Basic error logging
    const logContext = {
      error: errorInfo.name,
      message: errorInfo.message,
      statusCode: errorInfo.statusCode,
      path: req?.path,
      method: req?.method,
      userAgent: req?.get('User-Agent'),
      userId: req?.user?.id,
      sessionId: req?.sessionId,
      timestamp: new Date().toISOString()
    };

    // Log to console with appropriate level
    if (errorInfo.severity === 'critical') {
      console.error('CRITICAL ERROR:', logContext);
    } else if (errorInfo.severity === 'warning') {
      console.warn('WARNING:', logContext);
    } else {
      console.log('INFO:', logContext);
    }

    // Log security-related errors to security audit system
    if (errorInfo.isSecurityRelated && req) {
      SecurityAudit.logEvent({
        userId: req.user?.id,
        eventType: 'security_error',
        eventDescription: `Security-related error: ${errorInfo.name}`,
        severity: errorInfo.severity,
        ipAddress: SecurityAudit.getClientIP(req),
        userAgent: req.get('User-Agent'),
        metadata: {
          errorName: errorInfo.name,
          errorMessage: errorInfo.message,
          statusCode: errorInfo.statusCode,
          path: req.path,
          method: req.method
        }
      });
    }

    // Log critical errors to security audit system
    if (errorInfo.severity === 'critical' && req) {
      SecurityAudit.logEvent({
        userId: req.user?.id,
        eventType: 'critical_error',
        eventDescription: `Critical system error: ${errorInfo.message}`,
        severity: 'critical',
        ipAddress: SecurityAudit.getClientIP(req),
        userAgent: req.get('User-Agent'),
        metadata: {
          errorName: errorInfo.name,
          errorMessage: errorInfo.message,
          statusCode: errorInfo.statusCode,
          stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
        }
      });
    }
  }

  /**
   * Send appropriate error response to client
   */
  static sendErrorResponse(res, errorInfo, req) {
    // Prevent multiple responses
    if (res.headersSent) {
      return;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const statusCode = errorInfo.statusCode;
    
    // Base response object
    const response = {
      error: true,
      timestamp: new Date().toISOString(),
      path: req?.path,
      method: req?.method
    };

    // Handle specific error types
    switch (errorInfo.name) {
      case 'ValidationError':
        response.message = 'Invalid input data';
        response.details = isProduction ? undefined : errorInfo.message;
        break;

      case 'JsonWebTokenError':
        response.message = 'Invalid authentication token';
        response.code = 'INVALID_TOKEN';
        break;

      case 'TokenExpiredError':
        response.message = 'Authentication token has expired';
        response.code = 'TOKEN_EXPIRED';
        break;

      case 'UnauthorizedError':
        response.message = 'Authentication required';
        response.code = 'UNAUTHORIZED';
        break;

      case 'ForbiddenError':
        response.message = 'Access denied';
        response.code = 'FORBIDDEN';
        break;

      case 'CastError':
        response.message = 'Invalid data format';
        break;

      case 'MongoError':
      case 'SequelizeValidationError':
        response.message = 'Database operation failed';
        break;

      case 'MulterError':
        if (errorInfo.code === 'LIMIT_FILE_SIZE') {
          response.message = 'File size exceeds maximum allowed limit';
        } else if (errorInfo.code === 'LIMIT_FILE_COUNT') {
          response.message = 'Too many files uploaded';
        } else {
          response.message = 'File upload error';
        }
        break;

      default:
        // Generic error messages based on status code
        if (statusCode >= 500) {
          response.message = 'Internal server error';
        } else if (statusCode === 404) {
          response.message = 'Resource not found';
        } else if (statusCode === 400) {
          response.message = 'Bad request';
        } else if (statusCode === 401) {
          response.message = 'Authentication required';
        } else if (statusCode === 403) {
          response.message = 'Access denied';
        } else if (statusCode === 429) {
          response.message = 'Too many requests';
          response.retryAfter = errorInfo.retryAfter;
        } else {
          response.message = isProduction ? 'An error occurred' : errorInfo.message;
        }
    }

    // Add error details in development
    if (!isProduction) {
      response.error_details = {
        name: errorInfo.name,
        message: errorInfo.message,
        stack: errorInfo.stack
      };
    }

    // Add request ID for tracking if available
    if (req?.id) {
      response.requestId = req.id;
    }

    // Set security headers for error responses
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    // Send response
    res.status(statusCode).json(response);
  }

  /**
   * Express async error wrapper
   * Wraps async route handlers to catch errors
   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Not Found handler
   */
  static notFound(req, res) {
    // Log 404s for potential reconnaissance attempts
    if (req.path.includes('admin') || 
        req.path.includes('config') || 
        req.path.includes('.env') ||
        req.path.includes('wp-') ||
        req.path.includes('phpmyadmin')) {
      
      SecurityAudit.logSuspiciousActivity(req, 
        'Suspicious 404 request for sensitive path', 
        'warning',
        { path: req.path }
      );
    }

    const response = {
      error: true,
      message: 'Route not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    };

    res.status(404).json(response);
  }

  /**
   * Unhandled rejection handler
   */
  static unhandledRejection(reason, promise) {
    console.error('Unhandled Promise Rejection:', reason);
    
    SecurityAudit.logEvent({
      eventType: 'unhandled_rejection',
      eventDescription: 'Unhandled promise rejection detected',
      severity: 'critical',
      metadata: {
        reason: reason?.message || String(reason),
        stack: reason?.stack
      }
    });

    // In production, you might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      console.log('Shutting down due to unhandled promise rejection');
      process.exit(1);
    }
  }

  /**
   * Uncaught exception handler
   */
  static uncaughtException(error) {
    console.error('Uncaught Exception:', error);
    
    SecurityAudit.logEvent({
      eventType: 'uncaught_exception',
      eventDescription: 'Uncaught exception detected',
      severity: 'critical',
      metadata: {
        error: error.message,
        stack: error.stack
      }
    });

    // Always exit on uncaught exceptions
    console.log('Shutting down due to uncaught exception');
    process.exit(1);
  }
}

// Set up global error handlers
process.on('unhandledRejection', ErrorHandler.unhandledRejection);
process.on('uncaughtException', ErrorHandler.uncaughtException);

module.exports = ErrorHandler;