const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../database/connection');
const SecurityAudit = require('./securityAudit');

class JWTSecurity {
  constructor() {
    // Ensure JWT secrets are strong
    this.validateSecrets();
  }

  // Validate JWT secrets are secure
  validateSecrets() {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || accessSecret.length < 64) {
      throw new Error('JWT_SECRET must be at least 64 characters long');
    }

    if (!refreshSecret || refreshSecret.length < 64) {
      throw new Error('JWT_REFRESH_SECRET must be at least 64 characters long');
    }

    if (accessSecret === refreshSecret) {
      throw new Error('JWT access and refresh secrets must be different');
    }
  }

  // Generate secure tokens with enhanced claims
  generateTokens(userId, userRole, sessionId = null) {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomBytes(16).toString('hex'); // Unique token ID
    
    // Short-lived access token (15 minutes)
    const accessTokenPayload = {
      userId,
      role: userRole,
      sessionId,
      type: 'access',
      iat: now,
      jti: `access_${jti}`
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '15m',
        issuer: 'recovr-api',
        audience: 'recovr-app',
        algorithm: 'HS256'
      }
    );

    // Longer-lived refresh token (7 days) with rotation
    const refreshTokenPayload = {
      userId,
      sessionId,
      type: 'refresh',
      iat: now,
      jti: `refresh_${jti}`
    };

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.JWT_REFRESH_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'recovr-api',
        audience: 'recovr-app',
        algorithm: 'HS256'
      }
    );

    return { 
      accessToken, 
      refreshToken,
      sessionId: sessionId || jti,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer'
    };
  }

  // Store refresh token securely with metadata
  async storeRefreshToken(userId, refreshToken, sessionId, metadata = {}) {
    try {
      const decoded = jwt.decode(refreshToken);
      const expiresAt = new Date(decoded.exp * 1000);

      await pool.query(
        `INSERT INTO refresh_tokens 
         (user_id, token, session_id, expires_at, ip_address, user_agent, device_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          refreshToken,
          sessionId,
          expiresAt,
          metadata.ipAddress || null,
          metadata.userAgent || null,
          JSON.stringify(metadata.deviceInfo || {})
        ]
      );

      // Clean up old tokens for this user (keep only last 5 devices)
      await this.cleanupOldTokens(userId);

    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw new Error('Failed to store refresh token');
    }
  }

  // Verify and rotate refresh token
  async refreshTokens(refreshToken, metadata = {}) {
    try {
      // Verify token signature and expiration
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
        issuer: 'recovr-api',
        audience: 'recovr-app'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token exists in database and is not revoked
      const tokenQuery = `
        SELECT rt.user_id, rt.session_id, rt.is_revoked, u.role, u.is_active
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = $1 AND rt.expires_at > CURRENT_TIMESTAMP
      `;
      
      const tokenResult = await pool.query(tokenQuery, [refreshToken]);

      if (tokenResult.rows.length === 0) {
        await SecurityAudit.logSuspiciousActivity(
          { ip: metadata.ipAddress, headers: { 'user-agent': metadata.userAgent } },
          'Attempt to use invalid or expired refresh token',
          'warning',
          { token: refreshToken.substring(0, 10) + '...', userId: decoded.userId }
        );
        throw new Error('Invalid or expired refresh token');
      }

      const tokenData = tokenResult.rows[0];

      if (tokenData.is_revoked) {
        await SecurityAudit.logSuspiciousActivity(
          { ip: metadata.ipAddress, headers: { 'user-agent': metadata.userAgent } },
          'Attempt to use revoked refresh token',
          'critical',
          { userId: tokenData.user_id, sessionId: tokenData.session_id }
        );
        throw new Error('Token has been revoked');
      }

      if (!tokenData.is_active) {
        throw new Error('User account is deactivated');
      }

      // Generate new token pair
      const newTokens = this.generateTokens(
        tokenData.user_id, 
        tokenData.role, 
        tokenData.session_id
      );

      // Revoke old refresh token and store new one atomically
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Revoke old token
        await client.query(
          'UPDATE refresh_tokens SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP WHERE token = $1',
          [refreshToken]
        );

        // Store new refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await client.query(
          `INSERT INTO refresh_tokens 
           (user_id, token, session_id, expires_at, ip_address, user_agent, device_info)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            tokenData.user_id,
            newTokens.refreshToken,
            tokenData.session_id,
            expiresAt,
            metadata.ipAddress || null,
            metadata.userAgent || null,
            JSON.stringify(metadata.deviceInfo || {})
          ]
        );

        await client.query('COMMIT');

        // Log successful token refresh
        await SecurityAudit.logEvent({
          userId: tokenData.user_id,
          eventType: 'token_refreshed',
          eventDescription: 'Access token refreshed successfully',
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          severity: 'info',
          metadata: { sessionId: tokenData.session_id }
        });

        return {
          ...newTokens,
          userId: tokenData.user_id,
          role: tokenData.role
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        await SecurityAudit.logSuspiciousActivity(
          { ip: metadata.ipAddress, headers: { 'user-agent': metadata.userAgent } },
          `Invalid JWT refresh token: ${error.message}`,
          'warning'
        );
      }
      throw error;
    }
  }

  // Revoke specific refresh token
  async revokeRefreshToken(refreshToken, reason = 'Manual revocation') {
    try {
      const result = await pool.query(
        `UPDATE refresh_tokens 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revocation_reason = $1
         WHERE token = $2 AND is_revoked = false
         RETURNING user_id, session_id`,
        [reason, refreshToken]
      );

      if (result.rows.length > 0) {
        const { user_id, session_id } = result.rows[0];
        
        await SecurityAudit.logEvent({
          userId: user_id,
          eventType: 'token_revoked',
          eventDescription: `Refresh token revoked: ${reason}`,
          severity: 'info',
          metadata: { sessionId: session_id, reason }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  // Revoke all tokens for a user (e.g., password change, security breach)
  async revokeAllUserTokens(userId, reason = 'Security action') {
    try {
      const result = await pool.query(
        `UPDATE refresh_tokens 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revocation_reason = $1
         WHERE user_id = $2 AND is_revoked = false
         RETURNING session_id`,
        [reason, userId]
      );

      await SecurityAudit.logEvent({
        userId: userId,
        eventType: 'all_tokens_revoked',
        eventDescription: `All user tokens revoked: ${reason}`,
        severity: 'warning',
        metadata: { 
          reason, 
          revokedSessions: result.rows.map(r => r.session_id),
          count: result.rowCount 
        }
      });

      return result.rowCount;
    } catch (error) {
      console.error('Error revoking all user tokens:', error);
      throw error;
    }
  }

  // Clean up old tokens (keep only recent ones per user)
  async cleanupOldTokens(userId, keepCount = 5) {
    try {
      // Keep only the most recent tokens for each user
      await pool.query(
        `UPDATE refresh_tokens 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revocation_reason = 'Automatic cleanup'
         WHERE user_id = $1 
         AND id NOT IN (
           SELECT id FROM refresh_tokens 
           WHERE user_id = $1 AND is_revoked = false
           ORDER BY created_at DESC 
           LIMIT $2
         )
         AND is_revoked = false`,
        [userId, keepCount]
      );
    } catch (error) {
      console.error('Error cleaning up old tokens:', error);
    }
  }

  // Verify access token
  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'recovr-api',
        audience: 'recovr-app'
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if user is still active
      const userQuery = 'SELECT is_active, role FROM users WHERE id = $1';
      const userResult = await pool.query(userQuery, [decoded.userId]);

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        throw new Error('User not found or inactive');
      }

      return {
        userId: decoded.userId,
        role: userResult.rows[0].role,
        sessionId: decoded.sessionId,
        jti: decoded.jti
      };

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        // Don't log every expired token as suspicious (normal behavior)
        if (error.name !== 'TokenExpiredError') {
          console.warn('Invalid access token:', error.message);
        }
      }
      throw error;
    }
  }

  // Get active sessions for a user
  async getUserSessions(userId) {
    try {
      const query = `
        SELECT session_id, created_at, ip_address, user_agent, device_info,
               expires_at, is_revoked
        FROM refresh_tokens 
        WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows.map(row => ({
        sessionId: row.session_id,
        createdAt: row.created_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        deviceInfo: row.device_info,
        expiresAt: row.expires_at,
        isActive: !row.is_revoked
      }));

    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  }

  // Clean up expired tokens (run periodically)
  async cleanupExpiredTokens() {
    try {
      const result = await pool.query(
        'DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP'
      );
      
      console.log(`Cleaned up ${result.rowCount} expired refresh tokens`);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }
}

module.exports = new JWTSecurity();