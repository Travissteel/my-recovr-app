const DataFilter = require('../utils/dataFilter');
const SecurityAudit = require('../utils/securityAudit');

/**
 * Global response filtering middleware to catch any sensitive data leaks
 * This middleware should be applied to all routes to ensure no sensitive data
 * accidentally makes it into API responses
 */
const globalResponseFilter = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    try {
      // Skip filtering for error responses or null/undefined data
      if (!data || data.error || res.statusCode >= 400) {
        return originalJson.call(this, data);
      }

      // Determine user context
      const userRole = req.user?.role || 'guest';
      const isAuthenticated = !!req.user;
      
      // Validate response safety first
      const safetyCheck = DataFilter.validateResponseSafety(data);
      
      if (!safetyCheck.isSafe) {
        // Log critical security issue
        console.error('SECURITY ALERT: Sensitive data detected in response:', {
          path: req.path,
          method: req.method,
          issues: safetyCheck.criticalIssues,
          userId: req.user?.id
        });
        
        // Log to security audit
        SecurityAudit.logEvent({
          userId: req.user?.id,
          eventType: 'sensitive_data_leak_blocked',
          eventDescription: `Sensitive data blocked in API response for ${req.path}`,
          severity: 'critical',
          ipAddress: SecurityAudit.getClientIP(req),
          userAgent: req.get('User-Agent'),
          metadata: {
            path: req.path,
            method: req.method,
            issues: safetyCheck.criticalIssues,
            issueCount: safetyCheck.criticalIssues.length
          }
        });
        
        // Return generic error instead of sensitive data
        return originalJson.call(this, {
          error: 'Internal server error',
          message: 'Response contains sensitive data and has been blocked'
        });
      }
      
      // If there are warnings (potential PII), filter the data
      if (safetyCheck.warnings.length > 0) {
        console.warn('Response contains potential PII, applying additional filtering:', {
          path: req.path,
          warnings: safetyCheck.warnings
        });
        
        // Apply additional filtering
        data = DataFilter.filterSensitiveData(data, {
          allowSensitive: false,
          requesterRole: userRole
        });
      }
      
      // Log access to sensitive endpoints
      const sensitiveEndpoints = [
        '/admin',
        '/moderation',
        '/users',
        '/auth/sessions',
        '/auth/me'
      ];
      
      if (sensitiveEndpoints.some(endpoint => req.path.includes(endpoint))) {
        SecurityAudit.logDataAccess(req, `API response for ${req.path}`, {
          responseSize: JSON.stringify(data).length,
          hasWarnings: safetyCheck.warnings.length > 0
        });
      }
      
      return originalJson.call(this, data);
      
    } catch (error) {
      console.error('Response filtering error:', error);
      
      // Log the filtering error
      SecurityAudit.logEvent({
        userId: req.user?.id,
        eventType: 'response_filter_error',
        eventDescription: 'Error occurred while filtering API response',
        severity: 'error',
        metadata: { 
          error: error.message,
          path: req.path,
          method: req.method
        }
      });
      
      // Return generic error to prevent data leak through error message
      return originalJson.call(this, { 
        error: 'Internal server error',
        message: 'Response processing failed'
      });
    }
  };
  
  next();
};

/**
 * Middleware specifically for admin/moderation endpoints
 * Applies stricter filtering and additional logging
 */
const adminResponseFilter = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    try {
      // Verify user has admin/moderator role
      if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
        console.error('SECURITY ALERT: Non-admin user accessing admin endpoint:', {
          path: req.path,
          userId: req.user?.id,
          userRole: req.user?.role
        });
        
        SecurityAudit.logPrivilegeEscalation(req, 
          `Unauthorized access to admin endpoint: ${req.path}`, 
          req.user?.role || 'none', 
          'admin'
        );
        
        return originalJson.call(this, {
          error: 'Access denied',
          message: 'Insufficient permissions'
        });
      }
      
      // Apply strict data filtering for admin responses
      if (data && !data.error && res.statusCode < 400) {
        data = DataFilter.filterSensitiveData(data, {
          allowSensitive: true, // Admins can see more data
          requesterRole: req.user.role
        });
        
        // Still validate for critical security issues
        const safetyCheck = DataFilter.validateResponseSafety(data);
        
        if (!safetyCheck.isSafe) {
          console.error('SECURITY ALERT: Critical data leak in admin response:', {
            path: req.path,
            issues: safetyCheck.criticalIssues
          });
          
          SecurityAudit.logEvent({
            userId: req.user.id,
            eventType: 'admin_data_leak_blocked',
            eventDescription: `Critical data leak blocked in admin response for ${req.path}`,
            severity: 'critical',
            metadata: {
              path: req.path,
              issues: safetyCheck.criticalIssues
            }
          });
          
          return originalJson.call(this, {
            error: 'Internal server error',
            message: 'Admin response contains critical sensitive data'
          });
        }
      }
      
      // Log all admin data access
      SecurityAudit.logDataAccess(req, `Admin API access: ${req.path}`, {
        dataSize: data ? JSON.stringify(data).length : 0,
        hasData: !!data && !data.error
      });
      
      return originalJson.call(this, data);
      
    } catch (error) {
      console.error('Admin response filtering error:', error);
      
      SecurityAudit.logEvent({
        userId: req.user?.id,
        eventType: 'admin_response_filter_error',
        eventDescription: 'Error in admin response filtering',
        severity: 'error',
        metadata: { 
          error: error.message,
          path: req.path
        }
      });
      
      return originalJson.call(this, { 
        error: 'Internal server error',
        message: 'Admin response processing failed'
      });
    }
  };
  
  next();
};

module.exports = {
  globalResponseFilter,
  adminResponseFilter
};