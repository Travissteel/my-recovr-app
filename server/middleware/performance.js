/**
 * Performance Middleware
 * Implements caching, compression, and query optimization
 */

const compression = require('compression');
const { cache, CACHE_KEYS, CACHE_TTL } = require('../config/cache');

// Response compression middleware
const compressionMiddleware = compression({
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Compress all responses by default
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024 // Only compress responses larger than 1KB
});

// Cache response middleware
const cacheResponse = (keyPrefix, ttl = CACHE_TTL.MEDIUM) => {
  return async (req, res, next) => {
    // Skip caching for authenticated requests that modify data
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }

    // Generate cache key from request
    const cacheKey = cache.generateKey(keyPrefix, req.originalUrl, req.query);

    try {
      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode === 200) {
          cache.set(cacheKey, data, ttl);
        }
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Database query optimization middleware
const optimizeQuery = (req, res, next) => {
  // Add query optimization hints
  req.queryHints = {
    // Use connection pooling
    usePool: true,
    // Add query timeout
    timeout: 30000, // 30 seconds
    // Enable query caching
    cache: true
  };

  next();
};

// Request timing middleware
const requestTiming = (req, res, next) => {
  const start = Date.now();
  
  // Override res.end to capture timing
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    res.set('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
    
    return originalEnd.apply(this, args);
  };

  next();
};

// Memory usage monitoring
const memoryMonitor = (req, res, next) => {
  const memoryUsage = process.memoryUsage();
  
  // Log memory warnings
  if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    console.warn('High memory usage detected:', {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
    });
  }

  next();
};

// ETags for client-side caching
const etagSupport = (req, res, next) => {
  // Enable ETags for static-like responses
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  next();
};

// Pagination optimization
const optimizePagination = (req, res, next) => {
  // Set reasonable pagination defaults
  if (req.query.page) {
    req.query.page = Math.max(1, parseInt(req.query.page) || 1);
  }
  
  if (req.query.limit) {
    req.query.limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  }

  next();
};

// Bundle all performance middleware
const performanceMiddleware = {
  compression: compressionMiddleware,
  cacheResponse,
  optimizeQuery,
  requestTiming,
  memoryMonitor,
  etagSupport,
  optimizePagination
};

// Pre-configured cache middleware for common endpoints
const cacheMiddleware = {
  // Static data that rarely changes
  static: cacheResponse('static', CACHE_TTL.EXTENDED),
  
  // User-specific data
  user: cacheResponse('user', CACHE_TTL.SHORT),
  
  // Community data
  community: cacheResponse('community', CACHE_TTL.MEDIUM),
  
  // Dashboard data
  dashboard: cacheResponse('dashboard', CACHE_TTL.SHORT),
  
  // Subscription plans
  subscriptions: cacheResponse('subscriptions', CACHE_TTL.LONG)
};

module.exports = {
  performanceMiddleware,
  cacheMiddleware,
  cache
};