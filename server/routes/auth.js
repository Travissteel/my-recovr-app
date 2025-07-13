const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const PasswordValidator = require('../utils/passwordValidator');
const EmailVerification = require('../utils/emailVerification');
const SecurityAudit = require('../utils/securityAudit');
const JWTSecurity = require('../utils/jwtSecurity');
const DataFilter = require('../utils/dataFilter');
const { 
  authLimiter, 
  passwordResetLimiter, 
  progressiveAuthDelay 
} = require('../middleware/rateLimiter');
const { 
  extendSession, 
  getSessionInfo, 
  forceExpireSession, 
  getSessionStats 
} = require('../middleware/sessionManagement');
const { hasFeature, versionedRoute } = require('../middleware/apiVersioning');

const router = express.Router();

// Helper function to extract device info from request
const getDeviceInfo = (req) => {
  const userAgent = req.get('User-Agent') || '';
  const ipAddress = SecurityAudit.getClientIP(req);
  
  // Basic device detection (could be enhanced with a library like 'ua-parser-js')
  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
  const browser = userAgent.match(/(chrome|firefox|safari|edge|opera)/i)?.[0] || 'unknown';
  
  return {
    ipAddress,
    userAgent,
    isMobile,
    browser,
    timestamp: new Date().toISOString()
  };
};

// Register new user
router.post('/register', authLimiter, async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      username,
      phone,
      dateOfBirth,
      gender
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !username) {
      await SecurityAudit.logSuspiciousActivity(req, 'Registration attempt with missing required fields');
      return res.status(400).json({
        error: 'Email, password, first name, last name, and username are required'
      });
    }

    // Validate password strength
    const passwordValidation = PasswordValidator.validate(password);
    if (!passwordValidation.isValid) {
      await SecurityAudit.logAuthEvent(req, 'registration', false, null, { 
        reason: 'Weak password', 
        errors: passwordValidation.errors 
      });
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email) || email.length > 254) {
      await SecurityAudit.logSuspiciousActivity(req, 'Registration attempt with invalid email format', 'warning', { email });
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      const duplicateField = existing.email === email.toLowerCase() ? 'email' : 'username';
      
      await SecurityAudit.logSuspiciousActivity(req, 
        `Registration attempt with existing ${duplicateField}`, 
        'warning', 
        { email, username, duplicateField }
      );
      
      return res.status(409).json({
        error: 'User with this email or username already exists'
      });
    }

    // Hash password with secure rounds
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 14; // Increased from 12
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user (starts unverified)
    const userQuery = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, username, 
        phone, date_of_birth, gender, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, first_name, last_name, username, created_at
    `;

    const userResult = await pool.query(userQuery, [
      email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      username.toLowerCase(),
      phone,
      dateOfBirth,
      gender,
      false // Require email verification
    ]);

    const user = userResult.rows[0];

    // Send email verification
    try {
      const verificationToken = EmailVerification.generateVerificationToken();
      await EmailVerification.storeVerificationToken(user.id, verificationToken);
      await EmailVerification.sendVerificationEmail(user.email, user.first_name, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, but log it
      await SecurityAudit.logEvent({
        userId: user.id,
        eventType: 'email_verification_failed',
        eventDescription: 'Failed to send verification email during registration',
        severity: 'warning',
        metadata: { error: emailError.message }
      });
    }

    // Log successful registration
    await SecurityAudit.logAuthEvent(req, 'registration', true, user.id);

    // Filter user data for safe response
    const filteredUser = DataFilter.filterUserData(user, {
      includeEmail: true, // User just registered, they should see their email
      isOwner: true
    });

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: filteredUser,
      requiresVerification: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', authLimiter, progressiveAuthDelay, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      await SecurityAudit.logSuspiciousActivity(req, 'Login attempt with missing credentials');
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Check for brute force attempts
    const bruteForceCheck = await SecurityAudit.checkBruteForce(
      email.toLowerCase(), 
      SecurityAudit.getClientIP(req)
    );

    if (bruteForceCheck.isBruteForce) {
      await SecurityAudit.logSuspiciousActivity(req, 
        `Brute force login attempt blocked for ${email}`, 
        'critical',
        { attemptCount: bruteForceCheck.attemptCount }
      );
      return res.status(429).json({
        error: 'Too many failed login attempts. Please try again later.',
        retryAfter: '15 minutes'
      });
    }

    // Find user
    const userQuery = `
      SELECT id, email, password_hash, first_name, last_name, username, 
             is_active, is_verified, profile_picture_url, role,
             failed_login_attempts, account_locked_until
      FROM users 
      WHERE email = $1 OR username = $1
    `;

    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      await SecurityAudit.logAuthEvent(req, 'login', false, null, { 
        reason: 'User not found', email 
      });
      // Record failed attempt for progressive delay
      if (req.recordFailedAttempt) req.recordFailedAttempt();
      
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.account_locked_until && new Date() < user.account_locked_until) {
      await SecurityAudit.logSuspiciousActivity(req, 
        `Login attempt on locked account: ${user.email}`, 
        'warning'
      );
      return res.status(423).json({
        error: 'Account is temporarily locked. Please try again later or contact support.'
      });
    }

    if (!user.is_active) {
      await SecurityAudit.logAuthEvent(req, 'login', false, user.id, { 
        reason: 'Account deactivated' 
      });
      return res.status(401).json({
        error: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockUntil = null;
      
      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3',
        [newFailedAttempts, lockUntil, user.id]
      );

      await SecurityAudit.logAuthEvent(req, 'login', false, user.id, { 
        reason: 'Invalid password',
        failedAttempts: newFailedAttempts,
        accountLocked: !!lockUntil
      });

      // Record failed attempt for progressive delay
      if (req.recordFailedAttempt) req.recordFailedAttempt();

      return res.status(401).json({
        error: lockUntil ? 
          'Too many failed attempts. Account locked for 30 minutes.' : 
          'Invalid credentials'
      });
    }

    // Check if email is verified (for new registrations)
    if (!user.is_verified) {
      await SecurityAudit.logAuthEvent(req, 'login', false, user.id, { 
        reason: 'Email not verified' 
      });
      return res.status(403).json({
        error: 'Please verify your email address before logging in.',
        requiresVerification: true,
        userId: user.id
      });
    }

    // Reset failed login attempts and unlock account on successful login
    await pool.query(
      `UPDATE users SET 
        last_login = CURRENT_TIMESTAMP, 
        failed_login_attempts = 0, 
        account_locked_until = NULL 
       WHERE id = $1`,
      [user.id]
    );

    // Generate secure tokens with enhanced metadata
    const deviceInfo = getDeviceInfo(req);
    const tokens = JWTSecurity.generateTokens(user.id, user.role);

    // Store refresh token with metadata
    await JWTSecurity.storeRefreshToken(
      user.id, 
      tokens.refreshToken, 
      tokens.sessionId,
      deviceInfo
    );

    // Log successful login
    await SecurityAudit.logAuthEvent(req, 'login', true, user.id, {
      sessionId: tokens.sessionId,
      deviceInfo: deviceInfo
    });

    // Clear failed attempts from progressive delay
    if (req.clearAttempts) req.clearAttempts();

    // Filter user data for safe response
    const filteredUser = DataFilter.filterUserData(user, {
      includeEmail: true, // User logging in should see their email
      isOwner: true,
      requesterRole: user.role
    });

    // Build response object
    const response = {
      message: 'Login successful',
      user: filteredUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType,
      sessionId: tokens.sessionId
    };

    // Add enhanced features for API v2+
    if (hasFeature(req, 'enhanced_jwt')) {
      response.security = {
        tokenRotationEnabled: true,
        sessionTrackingEnabled: true,
        deviceTrackingEnabled: true
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Login error:', error);
    await SecurityAudit.logEvent({
      eventType: 'login_error',
      eventDescription: 'Login process failed with error',
      severity: 'error',
      metadata: { error: error.message }
    });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify email address
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    const result = await EmailVerification.verifyEmailToken(token);

    if (!result.success) {
      await SecurityAudit.logSuspiciousActivity(req, 
        'Invalid email verification token used', 
        'warning',
        { token: token.substring(0, 8) + '...' }
      );
      return res.status(400).json({
        error: result.error
      });
    }

    // Log successful verification
    await SecurityAudit.logEvent({
      userId: result.userId,
      eventType: 'email_verified',
      eventDescription: 'Email address successfully verified',
      ipAddress: SecurityAudit.getClientIP(req),
      userAgent: req.get('User-Agent'),
      severity: 'info'
    });

    // Filter user data for safe response
    const filteredUser = DataFilter.filterUserData(result, {
      includeEmail: true, // User just verified their email
      isOwner: true
    });

    res.json({
      message: 'Email verified successfully',
      user: filteredUser
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Resend verification email
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, first_name, is_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({
        message: 'If the email is registered, a verification email has been sent'
      });
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        error: 'Email is already verified'
      });
    }

    await EmailVerification.resendVerificationEmail(user.id);

    await SecurityAudit.logEvent({
      userId: user.id,
      eventType: 'verification_email_resent',
      eventDescription: 'Verification email resent',
      ipAddress: SecurityAudit.getClientIP(req),
      userAgent: req.get('User-Agent'),
      severity: 'info'
    });

    res.json({
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    
    if (error.message.includes('wait 5 minutes')) {
      return res.status(429).json({
        error: error.message
      });
    }
    
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Get device info for security tracking
    const deviceInfo = getDeviceInfo(req);
    const metadata = {
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      deviceInfo: deviceInfo
    };

    // Use enhanced JWT security for token refresh
    const newTokens = await JWTSecurity.refreshTokens(refreshToken, metadata);

    // Log successful token refresh
    await SecurityAudit.logAuthEvent(req, 'token_refresh', true, newTokens.userId, {
      sessionId: newTokens.sessionId
    });

    res.json({
      message: 'Tokens refreshed successfully',
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresIn: newTokens.expiresIn,
      tokenType: newTokens.tokenType,
      sessionId: newTokens.sessionId
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    await SecurityAudit.logAuthEvent(req, 'token_refresh', false, null, {
      reason: error.message
    });
    
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Use enhanced JWT security for token revocation
      await JWTSecurity.revokeRefreshToken(refreshToken, 'User logout');
    }

    // Log successful logout
    await SecurityAudit.logAuthEvent(req, 'logout', true, req.user.id);

    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    
    await SecurityAudit.logEvent({
      userId: req.user?.id,
      eventType: 'logout_error',
      eventDescription: 'Logout process failed with error',
      severity: 'warning',
      metadata: { error: error.message }
    });
    
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userQuery = `
      SELECT id, email, first_name, last_name, username, phone, 
             date_of_birth, gender, created_at, is_verified, 
             profile_picture_url, bio, privacy_settings, preferences
      FROM users 
      WHERE id = $1
    `;

    const userResult = await pool.query(userQuery, [req.user.id]);
    const user = userResult.rows[0];

    // Filter user data for safe response - user viewing their own data
    const filteredUser = DataFilter.filterUserData(user, {
      includeEmail: true,
      includePhone: true,
      includeSensitiveMetadata: true,
      isOwner: true,
      requesterRole: req.user.role
    });

    res.json({
      user: filteredUser
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Get active sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await JWTSecurity.getUserSessions(req.user.id);
    
    // Mark current session and filter sensitive data
    const currentSessionId = req.sessionId;
    const filteredSessions = sessions.map(session => {
      const filtered = DataFilter.filterSensitiveData(session, {
        allowSensitive: false,
        requesterRole: req.user.role
      });
      
      return {
        ...filtered,
        isCurrent: session.sessionId === currentSessionId
      };
    });

    res.json({
      sessions: filteredSessions,
      currentSession: currentSessionId
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Revoke a specific session
router.post('/sessions/:sessionId/revoke', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (sessionId === req.sessionId) {
      return res.status(400).json({
        error: 'Cannot revoke current session. Use logout instead.'
      });
    }

    // Find and revoke the session's refresh token
    const tokenQuery = `
      SELECT token FROM refresh_tokens 
      WHERE user_id = $1 AND session_id = $2 AND is_revoked = false
    `;
    
    const tokenResult = await pool.query(tokenQuery, [req.user.id, sessionId]);
    
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found or already revoked'
      });
    }

    const refreshToken = tokenResult.rows[0].token;
    await JWTSecurity.revokeRefreshToken(refreshToken, 'Revoked by user');

    await SecurityAudit.logEvent({
      userId: req.user.id,
      eventType: 'session_revoked',
      eventDescription: `User revoked session: ${sessionId}`,
      ipAddress: SecurityAudit.getClientIP(req),
      userAgent: req.get('User-Agent'),
      severity: 'info',
      metadata: { revokedSessionId: sessionId, currentSessionId: req.sessionId }
    });

    res.json({
      message: 'Session revoked successfully'
    });

  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    const passwordValidation = PasswordValidator.validate(newPassword);
    if (!passwordValidation.isValid) {
      await SecurityAudit.logAuthEvent(req, 'password_change', false, req.user.id, { 
        reason: 'Weak new password', 
        errors: passwordValidation.errors 
      });
      return res.status(400).json({
        error: 'New password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Get current password hash
    const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPasswordHash = userResult.rows[0].password_hash;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);

    if (!isCurrentPasswordValid) {
      await SecurityAudit.logAuthEvent(req, 'password_change', false, req.user.id, {
        reason: 'Incorrect current password'
      });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password with secure rounds
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 14;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    // Revoke all refresh tokens for this user (force re-login for security)
    const revokedCount = await JWTSecurity.revokeAllUserTokens(req.user.id, 'Password changed');

    // Log successful password change
    await SecurityAudit.logAuthEvent(req, 'password_change', true, req.user.id, {
      revokedTokensCount: revokedCount
    });

    res.json({ 
      message: 'Password changed successfully. Please log in again.',
      requiresReauth: true
    });

  } catch (error) {
    console.error('Change password error:', error);
    
    await SecurityAudit.logEvent({
      userId: req.user?.id,
      eventType: 'password_change_error',
      eventDescription: 'Password change failed with error',
      severity: 'error',
      metadata: { error: error.message }
    });
    
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Extend current session (reset idle timer)
router.post('/session/extend', authenticateToken, async (req, res) => {
  try {
    const extended = extendSession(req.sessionId);
    
    if (extended) {
      await SecurityAudit.logEvent({
        userId: req.user.id,
        eventType: 'session_extended',
        eventDescription: 'User session extended',
        ipAddress: SecurityAudit.getClientIP(req),
        userAgent: req.get('User-Agent'),
        severity: 'info',
        metadata: { sessionId: req.sessionId }
      });

      res.json({
        message: 'Session extended successfully',
        sessionInfo: req.sessionInfo
      });
    } else {
      res.status(404).json({
        error: 'Session not found'
      });
    }

  } catch (error) {
    console.error('Session extend error:', error);
    res.status(500).json({ error: 'Failed to extend session' });
  }
});

// Get current session information
router.get('/session/info', authenticateToken, async (req, res) => {
  try {
    const sessionInfo = getSessionInfo(req.sessionId);
    
    if (sessionInfo) {
      const filteredSessionInfo = DataFilter.filterSensitiveData(sessionInfo, {
        allowSensitive: false,
        requesterRole: req.user.role
      });

      res.json({
        sessionInfo: {
          ...filteredSessionInfo,
          current: true,
          sessionId: req.sessionId
        }
      });
    } else {
      res.status(404).json({
        error: 'Session information not found'
      });
    }

  } catch (error) {
    console.error('Get session info error:', error);
    res.status(500).json({ error: 'Failed to get session information' });
  }
});

// Force expire a specific session (for security purposes)
router.post('/session/:sessionId/expire', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason = 'Manual termination' } = req.body;

    // Only allow users to expire their own sessions, or admins to expire any session
    const sessionInfo = getSessionInfo(sessionId);
    
    if (!sessionInfo) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    if (sessionInfo.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Cannot expire another user\'s session'
      });
    }

    const expired = await forceExpireSession(sessionId, reason);
    
    if (expired) {
      await SecurityAudit.logEvent({
        userId: req.user.id,
        eventType: 'session_force_expired',
        eventDescription: `Session force expired: ${reason}`,
        ipAddress: SecurityAudit.getClientIP(req),
        userAgent: req.get('User-Agent'),
        severity: 'warning',
        metadata: { 
          expiredSessionId: sessionId,
          targetUserId: sessionInfo.userId,
          reason 
        }
      });

      res.json({
        message: 'Session expired successfully'
      });
    } else {
      res.status(404).json({
        error: 'Session not found or already expired'
      });
    }

  } catch (error) {
    console.error('Force expire session error:', error);
    res.status(500).json({ error: 'Failed to expire session' });
  }
});

// Get session statistics (admin only, v2+ only)
router.get('/sessions/stats', authenticateToken, versionedRoute('v2'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    const stats = getSessionStats();

    // Convert Map to object for JSON response
    const userSessionCounts = {};
    for (const [userId, count] of stats.userSessions.entries()) {
      userSessionCounts[userId] = count;
    }

    const response = {
      ...stats,
      userSessions: userSessionCounts,
      avgSessionAgeMinutes: Math.round(stats.avgSessionAge / 60000),
      avgRequestsPerSession: Math.round(stats.avgRequestsPerSession)
    };

    await SecurityAudit.logDataAccess(req, 'Session statistics accessed');

    res.json({
      sessionStats: response
    });

  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({ error: 'Failed to get session statistics' });
  }
});

module.exports = router;