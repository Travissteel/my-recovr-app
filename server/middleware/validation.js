const rateLimit = require('express-rate-limit');

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Sanitize input to prevent XSS
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        req.body[key] = req.body[key].replace(/javascript:/gi, '');
        req.body[key] = req.body[key].replace(/on\w+=/gi, '');
      }
    });
  }
  next();
};

// Rate limiting for sensitive endpoints
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Logging middleware for security events
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    };
    
    // Log failed authentication attempts
    if (req.url.includes('/auth/') && res.statusCode >= 400) {
      console.warn('Security Alert - Failed Auth:', logData);
    }
    
    // Log suspicious activity
    if (res.statusCode === 429 || res.statusCode === 403) {
      console.warn('Security Alert - Rate Limited/Forbidden:', logData);
    }
  });
  
  next();
};

// Content type validation
const validateContentType = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        error: 'Unsupported Media Type. Expected application/json'
      });
    }
  }
  next();
};

// Chatbot input validation
const validateChatInput = (req, res, next) => {
  const { message, conversationId } = req.body;

  // Validate message
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Message is required and must be a string'
    });
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    return res.status(400).json({
      error: 'Message cannot be empty'
    });
  }

  if (trimmedMessage.length > 1000) {
    return res.status(400).json({
      error: 'Message must be less than 1000 characters'
    });
  }

  // Basic content filtering
  const inappropriatePatterns = [
    /\b(spam|scam|advertisement)\b/i,
    /\b(sell|buy|promotion)\b/i,
    /http[s]?:\/\/(?!recovr\.com)/i // Block external links except our domain
  ];
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(trimmedMessage)) {
      return res.status(400).json({
        error: 'Message contains inappropriate content'
      });
    }
  }

  // Validate conversation ID if provided
  if (conversationId && typeof conversationId !== 'string') {
    return res.status(400).json({
      error: 'Conversation ID must be a string'
    });
  }

  // Sanitize the message
  req.body.message = trimmedMessage
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');

  next();
};

module.exports = {
  validateInput,
  sanitizeInput,
  strictRateLimit,
  authRateLimit,
  securityLogger,
  validateContentType,
  validateChatInput
};