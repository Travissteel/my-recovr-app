const pool = require('../database/connection');
const SecurityAudit = require('../utils/securityAudit');

// Role hierarchy for authorization checks
const ROLE_HIERARCHY = {
  'user': 0,
  'moderator': 1,
  'admin': 2,
  'super_admin': 3
};

// Permission sets for different roles
const ROLE_PERMISSIONS = {
  'user': [
    'read:own_profile',
    'update:own_profile',
    'create:posts',
    'create:messages',
    'read:public_content'
  ],
  'moderator': [
    'read:flagged_content',
    'update:flagged_content',
    'create:moderation_actions',
    'read:user_profiles',
    'create:warnings',
    'read:moderation_queue'
  ],
  'admin': [
    'read:all_users',
    'update:user_restrictions',
    'delete:content',
    'read:audit_logs',
    'manage:moderation_settings',
    'create:moderators'
  ],
  'super_admin': [
    'manage:system_settings',
    'create:admins',
    'access:security_logs',
    'manage:platform_config'
  ]
};

class Authorization {
  // Check if user has required role level
  static requireRole(minRole) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          await SecurityAudit.logSuspiciousActivity(req, 
            'Unauthorized access attempt - no user context'
          );
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Get user role from database (don't trust client)
        const userQuery = 'SELECT role, moderator_permissions, is_active FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [req.user.id]);

        if (userResult.rows.length === 0) {
          await SecurityAudit.logSuspiciousActivity(req, 
            'Access attempt with invalid user ID', 
            'warning',
            { userId: req.user.id }
          );
          return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        if (!user.is_active) {
          await SecurityAudit.logSuspiciousActivity(req, 
            'Access attempt by deactivated user',
            'warning',
            { userId: req.user.id, role: user.role }
          );
          return res.status(403).json({ error: 'Account is deactivated' });
        }

        const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
        const requiredRoleLevel = ROLE_HIERARCHY[minRole] || 0;

        if (userRoleLevel < requiredRoleLevel) {
          await SecurityAudit.logPrivilegeEscalation(
            req, 
            `Access to ${req.path}`, 
            user.role, 
            minRole
          );
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: minRole,
            current: user.role
          });
        }

        // Add user role info to request
        req.userRole = user.role;
        req.userPermissions = user.moderator_permissions || [];
        next();

      } catch (error) {
        console.error('Authorization error:', error);
        await SecurityAudit.logEvent({
          userId: req.user?.id,
          eventType: 'authorization_error',
          eventDescription: 'Role check failed with error',
          severity: 'error',
          metadata: { error: error.message }
        });
        res.status(500).json({ error: 'Authorization check failed' });
      }
    };
  }

  // Check if user has specific permission
  static requirePermission(permission) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const userQuery = 'SELECT role, moderator_permissions FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [req.user.id]);

        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        const userRole = user.role;
        const customPermissions = user.moderator_permissions || [];

        // Check if user has permission through role or custom permissions
        const rolePermissions = this.getRolePermissions(userRole);
        const hasPermission = rolePermissions.includes(permission) || 
                             customPermissions.includes(permission);

        if (!hasPermission) {
          await SecurityAudit.logPrivilegeEscalation(
            req,
            `Permission: ${permission}`,
            userRole,
            `permission:${permission}`
          );
          return res.status(403).json({ 
            error: 'Permission denied',
            required: permission
          });
        }

        req.userRole = userRole;
        req.userPermissions = [...rolePermissions, ...customPermissions];
        next();

      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ error: 'Permission check failed' });
      }
    };
  }

  // Get all permissions for a role (including inherited)
  static getRolePermissions(role) {
    const roleLevel = ROLE_HIERARCHY[role] || 0;
    let permissions = [];

    // Collect permissions from current role and all lower roles
    for (const [roleName, level] of Object.entries(ROLE_HIERARCHY)) {
      if (level <= roleLevel) {
        permissions = permissions.concat(ROLE_PERMISSIONS[roleName] || []);
      }
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  // Validate input parameters to prevent injection
  static validateInput(validationRules) {
    return (req, res, next) => {
      try {
        for (const [field, rules] of Object.entries(validationRules)) {
          const value = req.body[field] || req.query[field] || req.params[field];
          
          if (rules.required && (value === undefined || value === null || value === '')) {
            return res.status(400).json({
              error: `${field} is required`
            });
          }

          if (value !== undefined && value !== null) {
            // Type validation
            if (rules.type && typeof value !== rules.type) {
              return res.status(400).json({
                error: `${field} must be of type ${rules.type}`
              });
            }

            // String length validation
            if (rules.minLength && value.length < rules.minLength) {
              return res.status(400).json({
                error: `${field} must be at least ${rules.minLength} characters`
              });
            }

            if (rules.maxLength && value.length > rules.maxLength) {
              return res.status(400).json({
                error: `${field} must be no more than ${rules.maxLength} characters`
              });
            }

            // Regex pattern validation
            if (rules.pattern && !rules.pattern.test(value)) {
              return res.status(400).json({
                error: `${field} format is invalid`
              });
            }

            // Whitelist validation
            if (rules.allowedValues && !rules.allowedValues.includes(value)) {
              return res.status(400).json({
                error: `${field} must be one of: ${rules.allowedValues.join(', ')}`
              });
            }

            // Number range validation
            if (rules.min !== undefined && Number(value) < rules.min) {
              return res.status(400).json({
                error: `${field} must be at least ${rules.min}`
              });
            }

            if (rules.max !== undefined && Number(value) > rules.max) {
              return res.status(400).json({
                error: `${field} must be no more than ${rules.max}`
              });
            }
          }
        }

        next();
      } catch (error) {
        console.error('Input validation error:', error);
        res.status(500).json({ error: 'Input validation failed' });
      }
    };
  }

  // Sanitize SQL input to prevent injection
  static sanitizeTimeFilter(period) {
    const allowedPeriods = {
      '1h': "1 hour",
      '24h': "24 hours", 
      '7d': "7 days",
      '30d': "30 days",
      '90d': "90 days"
    };

    return allowedPeriods[period] || "7 days";
  }

  // Create safe SQL date filter with parameterized queries
  static createDateFilter(period) {
    const sanitizedPeriod = this.sanitizeTimeFilter(period);
    return {
      whereClause: "created_at >= CURRENT_TIMESTAMP - INTERVAL $1",
      parameter: sanitizedPeriod
    };
  }
}

// Convenience middleware exports
const requireModerator = Authorization.requireRole('moderator');
const requireAdmin = Authorization.requireRole('admin');
const requireSuperAdmin = Authorization.requireRole('super_admin');

module.exports = {
  Authorization,
  requireModerator,
  requireAdmin,
  requireSuperAdmin,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS
};