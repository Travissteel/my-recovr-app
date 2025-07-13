const SecurityAudit = require('../utils/securityAudit');

/**
 * Comprehensive Security Middleware
 * Implements multiple security headers and policies for production security
 */

/**
 * HTTPS Enforcement Middleware
 * Redirects HTTP requests to HTTPS in production
 */
const enforceHTTPS = (req, res, next) => {
  // Skip in development environment
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is already secure
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // Check for exceptions (health checks, webhooks, etc.)
  const httpAllowedPaths = [
    '/health',
    '/status',
    '/.well-known/',
    '/robots.txt'
  ];

  if (httpAllowedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Log insecure access attempt
  SecurityAudit.logSuspiciousActivity(req, 
    'HTTP access attempt to secure endpoint', 
    'warning',
    { 
      path: req.path,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    }
  );

  // Redirect to HTTPS
  const httpsUrl = `https://${req.get('Host')}${req.url}`;
  res.redirect(301, httpsUrl);
};

/**
 * Security Headers Middleware
 * Adds comprehensive security headers to all responses
 */
const securityHeaders = (req, res, next) => {
  // Strict Transport Security (HSTS)
  // Forces browsers to use HTTPS for future requests
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // X-Frame-Options: Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection: Enable XSS filtering (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy: Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // X-Download-Options: Prevent IE from executing downloads
  res.setHeader('X-Download-Options', 'noopen');

  // X-Permitted-Cross-Domain-Policies: Restrict Flash/PDF cross-domain access
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // X-DNS-Prefetch-Control: Control DNS prefetching
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Feature Policy / Permissions Policy: Control browser features
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
    'fullscreen=(self)',
    'autoplay=(self)'
  ].join(', ');
  
  res.setHeader('Permissions-Policy', permissionsPolicy);

  next();
};

/**
 * Content Security Policy (CSP) Middleware
 * Prevents XSS attacks and controls resource loading
 */
const contentSecurityPolicy = (req, res, next) => {
  // Generate nonce for inline scripts/styles
  const nonce = Buffer.from(require('crypto').randomBytes(16)).toString('base64');
  res.locals.nonce = nonce;

  // CSP directives
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Allow specific CDNs for production
      process.env.NODE_ENV === 'production' ? [] : ["'unsafe-eval'"] // Only for development
    ].flat(),
    'style-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-inline'", // Many CSS frameworks require this
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:'
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:' // For user uploaded images
    ],
    'media-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
    'block-all-mixed-content': process.env.NODE_ENV === 'production' ? [] : null,
    'connect-src': [
      "'self'",
      'wss:',
      'https:',
      // Allow connections to API endpoints
      process.env.API_URL || "'self'"
    ],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'prefetch-src': ["'self'"]
  };

  // Build CSP header value
  const cspHeader = Object.entries(cspDirectives)
    .filter(([key, value]) => value !== null)
    .map(([directive, sources]) => {
      if (Array.isArray(sources) && sources.length === 0) {
        return directive; // For directives without sources like upgrade-insecure-requests
      }
      return `${directive} ${Array.isArray(sources) ? sources.join(' ') : sources}`;
    })
    .join('; ');

  // Set CSP header
  res.setHeader('Content-Security-Policy', cspHeader);

  // Also set report-only for testing new policies
  if (process.env.CSP_REPORT_ONLY === 'true') {
    res.setHeader('Content-Security-Policy-Report-Only', cspHeader);
  }

  next();
};

/**
 * CORS Security Configuration
 * Controls cross-origin requests with security in mind
 */
const corsMiddleware = (req, res, next) => {
  const origin = req.get('Origin');
  
  // Define allowed origins
  const allowedOrigins = [
    'https://recovr.app',
    'https://www.recovr.app',
    'https://app.recovr.app',
    process.env.FRONTEND_URL,
    // Add development origins only in non-production
    ...(process.env.NODE_ENV !== 'production' ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    ] : [])
  ].filter(Boolean);

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow same-origin requests (no Origin header)
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Log suspicious cross-origin attempt
    SecurityAudit.logSuspiciousActivity(req, 
      'Blocked cross-origin request from unauthorized origin', 
      'warning',
      { 
        origin,
        path: req.path,
        method: req.method
      }
    );
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token'
  ].join(', '));
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};

/**
 * Request Size Limits Middleware
 * Prevents DoS attacks via large payloads
 */
const requestSizeLimits = (req, res, next) => {
  // Default limits
  const limits = {
    json: '10mb',        // JSON payload limit
    urlencoded: '10mb',  // URL-encoded payload limit
    raw: '50mb',         // Raw payload limit (for file uploads)
    text: '1mb'          // Text payload limit
  };

  // Adjust limits based on endpoint
  if (req.path.includes('/upload') || req.path.includes('/media')) {
    // Allow larger uploads for media endpoints
    limits.raw = '100mb';
    limits.json = '100mb';
  } else if (req.path.includes('/api/')) {
    // Stricter limits for API endpoints
    limits.json = '1mb';
    limits.urlencoded = '1mb';
  }

  // Set the limits for body parser middleware
  req.bodyLimits = limits;
  
  next();
};

/**
 * Rate Limiting per IP for general requests
 * Complements the existing auth rate limiting
 */
const generalRateLimit = (req, res, next) => {
  // This would typically use express-rate-limit or similar
  // For now, we'll implement basic tracking
  
  const clientIP = SecurityAudit.getClientIP(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 1000; // requests per window
  
  // In production, this should use Redis or similar
  if (!global.ipRateLimits) {
    global.ipRateLimits = new Map();
  }
  
  const ipData = global.ipRateLimits.get(clientIP) || { count: 0, resetTime: now + windowMs };
  
  // Reset if window has passed
  if (now > ipData.resetTime) {
    ipData.count = 0;
    ipData.resetTime = now + windowMs;
  }
  
  ipData.count++;
  global.ipRateLimits.set(clientIP, ipData);
  
  // Check if limit exceeded
  if (ipData.count > maxRequests) {
    SecurityAudit.logSuspiciousActivity(req, 
      `IP rate limit exceeded: ${ipData.count} requests`, 
      'warning',
      { 
        requestCount: ipData.count,
        windowMs,
        maxRequests
      }
    );
    
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((ipData.resetTime - now) / 1000)
    });
    return;
  }
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - ipData.count));
  res.setHeader('X-RateLimit-Reset', new Date(ipData.resetTime).toISOString());
  
  next();
};

/**
 * Security Monitoring Middleware
 * Logs and monitors various security metrics
 */
const securityMonitoring = (req, res, next) => {
  const startTime = Date.now();
  
  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /data:.*base64/i, // Data URI attacks
    /eval\s*\(/i, // Code injection
  ];
  
  const fullUrl = req.url;
  const userAgent = req.get('User-Agent') || '';
  
  // Check for suspicious patterns in URL and User-Agent
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl) || pattern.test(userAgent)) {
      SecurityAudit.logSuspiciousActivity(req, 
        'Suspicious pattern detected in request', 
        'critical',
        { 
          pattern: pattern.toString(),
          url: fullUrl,
          userAgent: userAgent.substring(0, 200) // Limit length
        }
      );
      break;
    }
  }
  
  // Monitor response
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log slow responses (potential DoS)
    if (responseTime > 5000) { // 5 seconds
      SecurityAudit.logEvent({
        eventType: 'slow_response',
        eventDescription: `Slow response detected: ${responseTime}ms`,
        severity: 'warning',
        metadata: {
          path: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode
        }
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  enforceHTTPS,
  securityHeaders,
  contentSecurityPolicy,
  corsMiddleware,
  requestSizeLimits,
  generalRateLimit,
  securityMonitoring
};