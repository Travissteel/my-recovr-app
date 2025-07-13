const crypto = require('crypto');
const logger = require('./logger');

// Generate secure random token
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash sensitive data
const hashData = (data, salt = null) => {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
};

// Verify hashed data
const verifyHashedData = (data, hash, salt) => {
  const { hash: computedHash } = hashData(data, salt);
  return computedHash === hash;
};

// Encrypt sensitive data
const encrypt = (text, key = process.env.ENCRYPTION_KEY) => {
  if (!key) {
    throw new Error('Encryption key not provided');
  }
  
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Decrypt sensitive data
const decrypt = (encryptedData, key = process.env.ENCRYPTION_KEY) => {
  if (!key) {
    throw new Error('Encryption key not provided');
  }
  
  const algorithm = 'aes-256-gcm';
  const decipher = crypto.createDecipher(algorithm, key);
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

// Check for SQL injection patterns
const detectSQLInjection = (input) => {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /UNION(?:\s+ALL)?\s+SELECT/i,
    /INSERT(?:\s+INTO)?\s+\w+/i,
    /UPDATE\s+\w+\s+SET/i,
    /DELETE\s+FROM\s+\w+/i,
    /DROP\s+(TABLE|DATABASE)\s+\w+/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// Check for XSS patterns
const detectXSS = (input) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src\s*=\s*["']javascript:/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

// Security middleware to detect malicious requests
const securityCheck = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip;
  const url = req.url;
  
  // Check for suspicious user agents
  const suspiciousUserAgents = [
    'sqlmap',
    'nikto',
    'masscan',
    'nmap',
    'havij',
    'gobuster'
  ];
  
  if (suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    logger.security('Suspicious user agent detected', { userAgent, ip, url });
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Check request body for malicious content
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    
    if (detectSQLInjection(bodyString)) {
      logger.security('SQL injection attempt detected', { ip, url, body: req.body });
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    if (detectXSS(bodyString)) {
      logger.security('XSS attempt detected', { ip, url, body: req.body });
      return res.status(400).json({ error: 'Invalid request' });
    }
  }
  
  next();
};

// Rate limiting per user
const userRateLimit = new Map();

const checkUserRateLimit = (userId, maxRequests = 100, windowMs = 60000) => {
  const now = Date.now();
  const userKey = `user_${userId}`;
  
  if (!userRateLimit.has(userKey)) {
    userRateLimit.set(userKey, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const userLimit = userRateLimit.get(userKey);
  
  if (now > userLimit.resetTime) {
    userRateLimit.set(userKey, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

module.exports = {
  generateSecureToken,
  hashData,
  verifyHashedData,
  encrypt,
  decrypt,
  isValidEmail,
  validatePasswordStrength,
  sanitizeInput,
  detectSQLInjection,
  detectXSS,
  securityCheck,
  checkUserRateLimit
};