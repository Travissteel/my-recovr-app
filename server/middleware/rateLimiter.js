const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

// Create Redis client for rate limiting (fallback to memory if Redis not available)
let redisClient;
try {
  redisClient = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  });
} catch (error) {
  console.warn('Redis not available for rate limiting, using memory store');
}

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }) : undefined
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  store: redisClient ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }) : undefined
});

// Very strict limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }) : undefined
});

// Account-specific rate limiter (by user ID)
const createAccountLimiter = (windowMs, max, message) => {
  const store = new Map();
  
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    
    if (!store.has(key)) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const data = store.get(key);
    
    if (now > data.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (data.count >= max) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }
    
    data.count++;
    next();
  };
};

// Messaging rate limiter (per user)
const messagingLimiter = createAccountLimiter(
  60 * 1000, // 1 minute
  10, // 10 messages per minute
  'Too many messages sent, please slow down.'
);

// Content creation limiter (per user)
const contentCreationLimiter = createAccountLimiter(
  5 * 60 * 1000, // 5 minutes
  5, // 5 posts per 5 minutes
  'Too much content created recently, please wait before posting again.'
);

// Progressive delay for failed authentication attempts
const createProgressiveDelay = () => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, { count: 0, lastAttempt: now });
      return next();
    }
    
    const data = attempts.get(key);
    const timeSinceLastAttempt = now - data.lastAttempt;
    
    // Reset counter after 1 hour of no attempts
    if (timeSinceLastAttempt > 60 * 60 * 1000) {
      attempts.set(key, { count: 0, lastAttempt: now });
      return next();
    }
    
    // Calculate delay based on attempt count
    const delayMs = Math.min(data.count * 1000, 30000); // Max 30 seconds
    
    if (timeSinceLastAttempt < delayMs) {
      return res.status(429).json({
        error: 'Please wait before attempting to login again.',
        retryAfter: Math.ceil((delayMs - timeSinceLastAttempt) / 1000)
      });
    }
    
    // Store this attempt
    req.recordFailedAttempt = () => {
      const current = attempts.get(key) || { count: 0, lastAttempt: now };
      attempts.set(key, { count: current.count + 1, lastAttempt: now });
    };
    
    req.clearAttempts = () => {
      attempts.delete(key);
    };
    
    next();
  };
};

const progressiveAuthDelay = createProgressiveDelay();

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  messagingLimiter,
  contentCreationLimiter,
  progressiveAuthDelay
};