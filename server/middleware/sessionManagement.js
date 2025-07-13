const JWTSecurity = require('../utils/jwtSecurity');
const SecurityAudit = require('../utils/securityAudit');

/**
 * Session Management and Timeout Middleware
 * Handles session timeouts, activity tracking, and automatic cleanup
 */

class SessionManager {
  constructor() {
    // Session timeout configurations (in milliseconds)
    this.timeouts = {
      idle: parseInt(process.env.SESSION_IDLE_TIMEOUT) || 30 * 60 * 1000,     // 30 minutes
      absolute: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT) || 8 * 60 * 60 * 1000, // 8 hours
      warning: parseInt(process.env.SESSION_WARNING_TIME) || 5 * 60 * 1000    // 5 minutes before timeout
    };
    
    // Track active sessions and their last activity
    this.activeSessions = new Map();
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Middleware to track session activity and check timeouts
   */
  trackActivity = (req, res, next) => {
    // Skip for unauthenticated requests
    if (!req.user || !req.sessionId) {
      return next();
    }

    const sessionId = req.sessionId;
    const userId = req.user.id;
    const now = Date.now();

    // Get or create session tracking data
    const sessionData = this.activeSessions.get(sessionId) || {
      userId: userId,
      createdAt: now,
      lastActivity: now,
      requestCount: 0,
      warningIssued: false
    };

    // Update activity
    const timeSinceLastActivity = now - sessionData.lastActivity;
    sessionData.lastActivity = now;
    sessionData.requestCount++;
    sessionData.ipAddress = SecurityAudit.getClientIP(req);
    sessionData.userAgent = req.get('User-Agent');

    // Check for session timeout
    const timeoutResult = this.checkSessionTimeout(sessionData, now);
    
    if (timeoutResult.expired) {
      // Session has expired
      this.expireSession(sessionId, sessionData, timeoutResult.reason);
      
      return res.status(401).json({
        error: 'Session expired',
        reason: timeoutResult.reason,
        code: 'SESSION_EXPIRED',
        message: `Your session has expired due to ${timeoutResult.reason}. Please log in again.`
      });
    }

    // Issue warning if session is close to expiring
    if (timeoutResult.warningNeeded && !sessionData.warningIssued) {
      sessionData.warningIssued = true;
      this.issueTimeoutWarning(sessionId, sessionData, timeoutResult.timeRemaining);
    }

    // Store updated session data
    this.activeSessions.set(sessionId, sessionData);
    
    // Add session info to request for potential use by routes
    req.sessionInfo = {
      createdAt: sessionData.createdAt,
      lastActivity: sessionData.lastActivity,
      requestCount: sessionData.requestCount,
      timeRemaining: this.timeouts.idle - timeSinceLastActivity
    };

    next();
  };

  /**
   * Check if session should timeout
   */
  checkSessionTimeout(sessionData, now) {
    const idleTime = now - sessionData.lastActivity;
    const totalTime = now - sessionData.createdAt;
    
    // Check absolute timeout
    if (totalTime > this.timeouts.absolute) {
      return {
        expired: true,
        reason: 'absolute timeout',
        timeRemaining: 0
      };
    }
    
    // Check idle timeout
    if (idleTime > this.timeouts.idle) {
      return {
        expired: true,
        reason: 'inactivity',
        timeRemaining: 0
      };
    }
    
    // Check if warning should be issued
    const timeToIdleTimeout = this.timeouts.idle - idleTime;
    const timeToAbsoluteTimeout = this.timeouts.absolute - totalTime;
    const timeRemaining = Math.min(timeToIdleTimeout, timeToAbsoluteTimeout);
    
    return {
      expired: false,
      warningNeeded: timeRemaining <= this.timeouts.warning && timeRemaining > 0,
      timeRemaining: timeRemaining
    };
  }

  /**
   * Expire a session and clean up
   */
  async expireSession(sessionId, sessionData, reason) {
    try {
      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      
      // Revoke the refresh token
      const refreshTokenQuery = `
        SELECT token FROM refresh_tokens 
        WHERE session_id = $1 AND is_revoked = false
      `;
      
      const result = await require('../database/connection').query(refreshTokenQuery, [sessionId]);
      
      if (result.rows.length > 0) {
        await JWTSecurity.revokeRefreshToken(
          result.rows[0].token, 
          `Session expired: ${reason}`
        );
      }
      
      // Log session expiration
      await SecurityAudit.logEvent({
        userId: sessionData.userId,
        eventType: 'session_expired',
        eventDescription: `User session expired: ${reason}`,
        severity: 'info',
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        metadata: {
          sessionId: sessionId,
          reason: reason,
          sessionDuration: Date.now() - sessionData.createdAt,
          requestCount: sessionData.requestCount
        }
      });
      
    } catch (error) {
      console.error('Error expiring session:', error);
    }
  }

  /**
   * Issue timeout warning (could be via WebSocket, email, etc.)
   */
  async issueTimeoutWarning(sessionId, sessionData, timeRemaining) {
    try {
      // Log the warning
      await SecurityAudit.logEvent({
        userId: sessionData.userId,
        eventType: 'session_timeout_warning',
        eventDescription: 'Session timeout warning issued',
        severity: 'info',
        metadata: {
          sessionId: sessionId,
          timeRemaining: timeRemaining,
          timeRemainingMinutes: Math.ceil(timeRemaining / 60000)
        }
      });
      
      // In a real application, you might emit a WebSocket event
      // or send an in-app notification to warn the user
      console.log(`Session timeout warning for user ${sessionData.userId}: ${Math.ceil(timeRemaining / 60000)} minutes remaining`);
      
    } catch (error) {
      console.error('Error issuing timeout warning:', error);
    }
  }

  /**
   * Extend session (reset idle timer)
   */
  extendSession(sessionId) {
    const sessionData = this.activeSessions.get(sessionId);
    if (sessionData) {
      sessionData.lastActivity = Date.now();
      sessionData.warningIssued = false;
      this.activeSessions.set(sessionId, sessionData);
      return true;
    }
    return false;
  }

  /**
   * Get session information
   */
  getSessionInfo(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Force expire a session
   */
  async forceExpireSession(sessionId, reason = 'Manual termination') {
    const sessionData = this.activeSessions.get(sessionId);
    if (sessionData) {
      await this.expireSession(sessionId, sessionData, reason);
      return true;
    }
    return false;
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId) {
    const userSessions = [];
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      if (sessionData.userId === userId) {
        userSessions.push({
          sessionId,
          createdAt: sessionData.createdAt,
          lastActivity: sessionData.lastActivity,
          requestCount: sessionData.requestCount,
          ipAddress: sessionData.ipAddress,
          userAgent: sessionData.userAgent
        });
      }
    }
    return userSessions;
  }

  /**
   * Cleanup expired sessions periodically
   */
  startCleanupInterval() {
    const cleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, cleanupInterval);
    
    console.log('Session cleanup interval started');
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      const timeoutResult = this.checkSessionTimeout(sessionData, now);
      
      if (timeoutResult.expired) {
        expiredSessions.push({ sessionId, sessionData, reason: timeoutResult.reason });
      }
    }
    
    // Expire all found expired sessions
    for (const { sessionId, sessionData, reason } of expiredSessions) {
      await this.expireSession(sessionId, sessionData, reason);
    }
    
    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const stats = {
      totalActiveSessions: this.activeSessions.size,
      userSessions: new Map(),
      avgSessionAge: 0,
      avgRequestsPerSession: 0
    };
    
    let totalAge = 0;
    let totalRequests = 0;
    const now = Date.now();
    
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      // Count sessions per user
      const userCount = stats.userSessions.get(sessionData.userId) || 0;
      stats.userSessions.set(sessionData.userId, userCount + 1);
      
      // Calculate averages
      totalAge += (now - sessionData.createdAt);
      totalRequests += sessionData.requestCount;
    }
    
    if (stats.totalActiveSessions > 0) {
      stats.avgSessionAge = totalAge / stats.totalActiveSessions;
      stats.avgRequestsPerSession = totalRequests / stats.totalActiveSessions;
    }
    
    return stats;
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

module.exports = {
  SessionManager,
  sessionManager,
  trackActivity: sessionManager.trackActivity,
  extendSession: sessionManager.extendSession.bind(sessionManager),
  getSessionInfo: sessionManager.getSessionInfo.bind(sessionManager),
  forceExpireSession: sessionManager.forceExpireSession.bind(sessionManager),
  getUserSessions: sessionManager.getUserSessions.bind(sessionManager),
  getSessionStats: sessionManager.getSessionStats.bind(sessionManager)
};