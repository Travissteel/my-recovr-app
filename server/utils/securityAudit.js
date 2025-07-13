const pool = require('../database/connection');

class SecurityAudit {
  // Log security events
  static async logEvent(eventData) {
    const {
      userId = null,
      eventType,
      eventDescription,
      ipAddress = null,
      userAgent = null,
      requestPath = null,
      requestMethod = null,
      severity = 'info',
      metadata = {}
    } = eventData;

    try {
      await pool.query(
        `INSERT INTO security_audit_log 
         (user_id, event_type, event_description, ip_address, user_agent, 
          request_path, request_method, severity, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          eventType,
          eventDescription,
          ipAddress,
          userAgent,
          requestPath,
          requestMethod,
          severity,
          JSON.stringify(metadata)
        ]
      );
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - security logging should not break the application
    }
  }

  // Log authentication events
  static async logAuthEvent(req, eventType, success, userId = null, additionalData = {}) {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.get('User-Agent');

    await this.logEvent({
      userId,
      eventType,
      eventDescription: `Authentication ${eventType}: ${success ? 'Success' : 'Failed'}`,
      ipAddress,
      userAgent,
      requestPath: req.path,
      requestMethod: req.method,
      severity: success ? 'info' : 'warning',
      metadata: {
        success,
        email: req.body.email || req.body.username,
        ...additionalData
      }
    });

    // Also log to login_attempts table
    if (eventType === 'login') {
      try {
        await pool.query(
          `INSERT INTO login_attempts (email, ip_address, success, failure_reason, user_agent)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            req.body.email || req.body.username || 'unknown',
            ipAddress,
            success,
            success ? null : additionalData.reason || 'Invalid credentials',
            userAgent
          ]
        );
      } catch (error) {
        console.error('Failed to log login attempt:', error);
      }
    }
  }

  // Log suspicious activity
  static async logSuspiciousActivity(req, description, severity = 'warning', metadata = {}) {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.get('User-Agent');

    await this.logEvent({
      userId: req.user?.id || null,
      eventType: 'suspicious_activity',
      eventDescription: description,
      ipAddress,
      userAgent,
      requestPath: req.path,
      requestMethod: req.method,
      severity,
      metadata
    });
  }

  // Log privilege escalation attempts
  static async logPrivilegeEscalation(req, attemptedAction, currentRole, requiredRole) {
    await this.logEvent({
      userId: req.user?.id || null,
      eventType: 'privilege_escalation_attempt',
      eventDescription: `User with role '${currentRole}' attempted action requiring '${requiredRole}': ${attemptedAction}`,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      requestMethod: req.method,
      severity: 'critical',
      metadata: {
        attemptedAction,
        currentRole,
        requiredRole
      }
    });
  }

  // Log data access events
  static async logDataAccess(req, dataType, recordId = null, action = 'read') {
    await this.logEvent({
      userId: req.user?.id || null,
      eventType: 'data_access',
      eventDescription: `${action.toUpperCase()} access to ${dataType}${recordId ? ` (ID: ${recordId})` : ''}`,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      requestMethod: req.method,
      severity: 'info',
      metadata: {
        dataType,
        recordId,
        action
      }
    });
  }

  // Log moderation actions
  static async logModerationAction(req, targetType, targetId, action, reason = null) {
    await this.logEvent({
      userId: req.user?.id || null,
      eventType: 'moderation_action',
      eventDescription: `Moderation action '${action}' taken on ${targetType} ${targetId}`,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      requestMethod: req.method,
      severity: 'info',
      metadata: {
        targetType,
        targetId,
        action,
        reason
      }
    });
  }

  // Check for brute force attempts
  static async checkBruteForce(email, ipAddress, timeWindowMinutes = 15, maxAttempts = 5) {
    const result = await pool.query(
      `SELECT COUNT(*) as attempt_count
       FROM login_attempts 
       WHERE (email = $1 OR ip_address = $2) 
       AND success = false 
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '${timeWindowMinutes} minutes'`,
      [email, ipAddress]
    );

    const attemptCount = parseInt(result.rows[0].attempt_count);
    return {
      isBruteForce: attemptCount >= maxAttempts,
      attemptCount,
      remainingAttempts: Math.max(0, maxAttempts - attemptCount)
    };
  }

  // Get client IP address (handles proxies)
  static getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '0.0.0.0';
  }

  // Clean up old audit logs (should be run periodically)
  static async cleanupOldLogs(daysToKeep = 90) {
    try {
      const result = await pool.query(
        `DELETE FROM security_audit_log 
         WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'`
      );
      
      console.log(`Cleaned up ${result.rowCount} old security audit logs`);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }

  // Clean up old login attempts
  static async cleanupOldLoginAttempts(daysToKeep = 30) {
    try {
      const result = await pool.query(
        `DELETE FROM login_attempts 
         WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'`
      );
      
      console.log(`Cleaned up ${result.rowCount} old login attempts`);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old login attempts:', error);
      throw error;
    }
  }

  // Get security metrics
  static async getSecurityMetrics(timeWindowHours = 24) {
    try {
      const metrics = {};

      // Failed login attempts
      const failedLogins = await pool.query(
        `SELECT COUNT(*) as count
         FROM login_attempts 
         WHERE success = false 
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '${timeWindowHours} hours'`
      );
      metrics.failedLoginAttempts = parseInt(failedLogins.rows[0].count);

      // Suspicious activities
      const suspiciousActivities = await pool.query(
        `SELECT COUNT(*) as count
         FROM security_audit_log 
         WHERE event_type = 'suspicious_activity' 
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '${timeWindowHours} hours'`
      );
      metrics.suspiciousActivities = parseInt(suspiciousActivities.rows[0].count);

      // Privilege escalation attempts
      const privilegeEscalations = await pool.query(
        `SELECT COUNT(*) as count
         FROM security_audit_log 
         WHERE event_type = 'privilege_escalation_attempt' 
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '${timeWindowHours} hours'`
      );
      metrics.privilegeEscalationAttempts = parseInt(privilegeEscalations.rows[0].count);

      // Critical events
      const criticalEvents = await pool.query(
        `SELECT COUNT(*) as count
         FROM security_audit_log 
         WHERE severity = 'critical' 
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '${timeWindowHours} hours'`
      );
      metrics.criticalEvents = parseInt(criticalEvents.rows[0].count);

      return metrics;
    } catch (error) {
      console.error('Failed to get security metrics:', error);
      throw error;
    }
  }
}

module.exports = SecurityAudit;