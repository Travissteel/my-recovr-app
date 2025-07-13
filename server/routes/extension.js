const express = require('express');
const crypto = require('crypto');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const SecurityAudit = require('../utils/securityAudit');
const JWTSecurity = require('../utils/jwtSecurity');
const DataFilter = require('../utils/dataFilter');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Browser Extension Authentication System
 * 
 * This system provides secure authentication for browser extensions with:
 * - Extension registration and validation
 * - Secure token exchange
 * - Extension-specific permissions
 * - Activity monitoring and logging
 */

class ExtensionSecurity {
  // Validate extension manifest and metadata
  static validateExtensionManifest(manifest) {
    const requiredFields = ['name', 'version', 'description', 'permissions'];
    const errors = [];
    
    for (const field of requiredFields) {
      if (!manifest[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate extension name format
    if (manifest.name && !/^[a-zA-Z0-9\s\-_]+$/.test(manifest.name)) {
      errors.push('Extension name contains invalid characters');
    }
    
    // Validate version format
    if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('Invalid version format (must be semantic versioning)');
    }
    
    // Check for suspicious permissions
    const dangerousPermissions = [
      'tabs',
      'activeTab',
      'webNavigation',
      'history',
      'bookmarks',
      'downloads',
      'management',
      'nativeMessaging'
    ];
    
    if (manifest.permissions) {
      const suspiciousPerms = manifest.permissions.filter(perm => 
        dangerousPermissions.includes(perm)
      );
      
      if (suspiciousPerms.length > 0) {
        errors.push(`Requires review for permissions: ${suspiciousPerms.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      requiresReview: manifest.permissions && 
        manifest.permissions.some(perm => dangerousPermissions.includes(perm))
    };
  }
  
  // Generate secure extension token
  static generateExtensionToken() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  // Create extension fingerprint for identity verification
  static createExtensionFingerprint(extensionData) {
    const fingerprintData = {
      name: extensionData.name,
      version: extensionData.version,
      id: extensionData.extension_id,
      permissions: extensionData.permissions
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }
}

// Register a new browser extension
router.post('/register', authenticateToken, authLimiter, async (req, res) => {
  try {
    const {
      extensionId,
      manifest,
      browserInfo,
      extensionMetadata = {}
    } = req.body;

    if (!extensionId || !manifest) {
      return res.status(400).json({
        error: 'Extension ID and manifest are required'
      });
    }

    // Validate extension manifest
    const manifestValidation = ExtensionSecurity.validateExtensionManifest(manifest);
    
    if (!manifestValidation.isValid) {
      await SecurityAudit.logSuspiciousActivity(req, 
        'Invalid extension registration attempt', 
        'warning',
        { 
          extensionId, 
          errors: manifestValidation.errors,
          manifest: manifest.name 
        }
      );
      
      return res.status(400).json({
        error: 'Invalid extension manifest',
        details: manifestValidation.errors
      });
    }

    // Check if extension is already registered by this user
    const existingQuery = `
      SELECT id, status FROM registered_extensions 
      WHERE user_id = $1 AND extension_id = $2
    `;
    
    const existingResult = await pool.query(existingQuery, [req.user.id, extensionId]);
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      
      if (existing.status === 'active') {
        return res.status(409).json({
          error: 'Extension already registered and active'
        });
      }
      
      // Reactivate if was previously deactivated
      await pool.query(
        'UPDATE registered_extensions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['active', existing.id]
      );
      
      return res.json({
        message: 'Extension reactivated successfully'
      });
    }

    // Generate secure tokens
    const extensionToken = ExtensionSecurity.generateExtensionToken();
    const fingerprint = ExtensionSecurity.createExtensionFingerprint({
      name: manifest.name,
      version: manifest.version,
      extension_id: extensionId,
      permissions: manifest.permissions
    });

    // Create registration record
    const registrationQuery = `
      INSERT INTO registered_extensions (
        user_id, extension_id, extension_token, manifest, fingerprint,
        browser_info, metadata, status, requires_review
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `;

    const status = manifestValidation.requiresReview ? 'pending_review' : 'active';
    
    const registrationResult = await pool.query(registrationQuery, [
      req.user.id,
      extensionId,
      extensionToken,
      JSON.stringify(manifest),
      fingerprint,
      JSON.stringify(browserInfo || {}),
      JSON.stringify(extensionMetadata),
      status,
      manifestValidation.requiresReview
    ]);

    const registration = registrationResult.rows[0];

    // Log extension registration
    await SecurityAudit.logEvent({
      userId: req.user.id,
      eventType: 'extension_registered',
      eventDescription: `Browser extension registered: ${manifest.name}`,
      ipAddress: SecurityAudit.getClientIP(req),
      userAgent: req.get('User-Agent'),
      severity: 'info',
      metadata: {
        extensionId,
        extensionName: manifest.name,
        version: manifest.version,
        status,
        requiresReview: manifestValidation.requiresReview,
        registrationId: registration.id
      }
    });

    // Response based on status
    if (status === 'pending_review') {
      res.status(202).json({
        message: 'Extension registered but requires manual review due to sensitive permissions',
        registrationId: registration.id,
        status: 'pending_review',
        requiresReview: true
      });
    } else {
      res.status(201).json({
        message: 'Extension registered successfully',
        registrationId: registration.id,
        extensionToken: extensionToken,
        status: 'active'
      });
    }

  } catch (error) {
    console.error('Extension registration error:', error);
    
    await SecurityAudit.logEvent({
      userId: req.user?.id,
      eventType: 'extension_registration_error',
      eventDescription: 'Extension registration failed with error',
      severity: 'error',
      metadata: { error: error.message }
    });
    
    res.status(500).json({ error: 'Extension registration failed' });
  }
});

// Authenticate extension and get access token
router.post('/authenticate', authLimiter, async (req, res) => {
  try {
    const {
      extensionId,
      extensionToken,
      fingerprint
    } = req.body;

    if (!extensionId || !extensionToken) {
      return res.status(400).json({
        error: 'Extension ID and token are required'
      });
    }

    // Find and validate extension registration
    const extensionQuery = `
      SELECT re.*, u.id as user_id, u.role, u.is_active
      FROM registered_extensions re
      JOIN users u ON re.user_id = u.id
      WHERE re.extension_id = $1 AND re.extension_token = $2
    `;
    
    const extensionResult = await pool.query(extensionQuery, [extensionId, extensionToken]);
    
    if (extensionResult.rows.length === 0) {
      await SecurityAudit.logSuspiciousActivity(req, 
        'Invalid extension authentication attempt', 
        'warning',
        { extensionId, tokenPrefix: extensionToken.substring(0, 8) + '...' }
      );
      
      return res.status(401).json({
        error: 'Invalid extension credentials'
      });
    }

    const extension = extensionResult.rows[0];

    // Check if extension is active
    if (extension.status !== 'active') {
      return res.status(403).json({
        error: `Extension status is ${extension.status}`,
        status: extension.status
      });
    }

    // Check if user account is active
    if (!extension.is_active) {
      return res.status(403).json({
        error: 'User account is deactivated'
      });
    }

    // Verify fingerprint if provided (optional but recommended)
    if (fingerprint && fingerprint !== extension.fingerprint) {
      await SecurityAudit.logSuspiciousActivity(req, 
        'Extension fingerprint mismatch - possible tampering', 
        'critical',
        { 
          extensionId, 
          expectedFingerprint: extension.fingerprint.substring(0, 16) + '...',
          providedFingerprint: fingerprint.substring(0, 16) + '...'
        }
      );
      
      return res.status(403).json({
        error: 'Extension fingerprint verification failed'
      });
    }

    // Generate JWT tokens for the extension
    const deviceInfo = {
      type: 'browser_extension',
      extensionId: extensionId,
      extensionName: JSON.parse(extension.manifest).name,
      version: JSON.parse(extension.manifest).version,
      registrationId: extension.id,
      fingerprint: extension.fingerprint
    };

    const tokens = JWTSecurity.generateTokens(extension.user_id, extension.role);
    
    // Store refresh token with extension-specific metadata
    await JWTSecurity.storeRefreshToken(
      extension.user_id,
      tokens.refreshToken,
      tokens.sessionId,
      {
        ipAddress: SecurityAudit.getClientIP(req),
        userAgent: req.get('User-Agent'),
        deviceInfo: deviceInfo
      }
    );

    // Update last authentication time
    await pool.query(
      'UPDATE registered_extensions SET last_auth_at = CURRENT_TIMESTAMP WHERE id = $1',
      [extension.id]
    );

    // Log successful extension authentication
    await SecurityAudit.logAuthEvent(req, 'extension_auth', true, extension.user_id, {
      extensionId,
      extensionName: JSON.parse(extension.manifest).name,
      sessionId: tokens.sessionId
    });

    res.json({
      message: 'Extension authenticated successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType,
      sessionId: tokens.sessionId,
      user: DataFilter.filterUserData({
        id: extension.user_id,
        role: extension.role
      }, {
        includeEmail: false,
        requesterRole: extension.role
      })
    });

  } catch (error) {
    console.error('Extension authentication error:', error);
    
    await SecurityAudit.logEvent({
      eventType: 'extension_auth_error',
      eventDescription: 'Extension authentication failed with error',
      severity: 'error',
      metadata: { error: error.message }
    });
    
    res.status(500).json({ error: 'Extension authentication failed' });
  }
});

// Get user's registered extensions
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT id, extension_id, manifest, status, created_at, 
             last_auth_at, requires_review, browser_info
      FROM registered_extensions 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [req.user.id]);
    
    // Filter sensitive data from extension list
    const filteredExtensions = result.rows.map(ext => {
      const manifest = JSON.parse(ext.manifest);
      return {
        id: ext.id,
        extensionId: ext.extension_id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        status: ext.status,
        createdAt: ext.created_at,
        lastAuthAt: ext.last_auth_at,
        requiresReview: ext.requires_review,
        browserInfo: DataFilter.filterSensitiveData(
          JSON.parse(ext.browser_info || '{}'), 
          { allowSensitive: false }
        )
      };
    });

    res.json({
      extensions: filteredExtensions
    });

  } catch (error) {
    console.error('Get extensions error:', error);
    res.status(500).json({ error: 'Failed to fetch extensions' });
  }
});

// Revoke extension access
router.post('/:extensionId/revoke', authenticateToken, async (req, res) => {
  try {
    const { extensionId } = req.params;

    // Find the extension
    const extensionQuery = `
      SELECT id, manifest FROM registered_extensions 
      WHERE user_id = $1 AND extension_id = $2 AND status = 'active'
    `;
    
    const extensionResult = await pool.query(extensionQuery, [req.user.id, extensionId]);
    
    if (extensionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Extension not found or already revoked'
      });
    }

    const extension = extensionResult.rows[0];
    const manifest = JSON.parse(extension.manifest);

    // Deactivate the extension
    await pool.query(
      'UPDATE registered_extensions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['revoked', extension.id]
    );

    // Revoke all refresh tokens for this extension
    // Note: This will revoke all sessions for this user from this extension
    await pool.query(
      `UPDATE refresh_tokens 
       SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revocation_reason = $1
       WHERE user_id = $2 AND device_info::text LIKE '%"extensionId":"' || $3 || '"%'`,
      ['Extension revoked by user', req.user.id, extensionId]
    );

    // Log extension revocation
    await SecurityAudit.logEvent({
      userId: req.user.id,
      eventType: 'extension_revoked',
      eventDescription: `Browser extension revoked: ${manifest.name}`,
      ipAddress: SecurityAudit.getClientIP(req),
      userAgent: req.get('User-Agent'),
      severity: 'info',
      metadata: {
        extensionId,
        extensionName: manifest.name
      }
    });

    res.json({
      message: 'Extension access revoked successfully'
    });

  } catch (error) {
    console.error('Extension revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke extension access' });
  }
});

// Get extension activity logs (for user transparency)
router.get('/:extensionId/activity', authenticateToken, async (req, res) => {
  try {
    const { extensionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user owns this extension
    const extensionQuery = `
      SELECT id FROM registered_extensions 
      WHERE user_id = $1 AND extension_id = $2
    `;
    
    const extensionResult = await pool.query(extensionQuery, [req.user.id, extensionId]);
    
    if (extensionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Extension not found'
      });
    }

    // Get activity logs related to this extension
    const activityQuery = `
      SELECT event_type, event_description, created_at, severity, metadata
      FROM security_audit_log 
      WHERE user_id = $1 
      AND (
        metadata::text LIKE '%"extensionId":"' || $2 || '"%'
        OR event_type LIKE '%extension%'
      )
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;
    
    const activityResult = await pool.query(activityQuery, [
      req.user.id, 
      extensionId, 
      limit, 
      offset
    ]);

    // Filter sensitive data from activity logs
    const filteredActivity = activityResult.rows.map(log => ({
      eventType: log.event_type,
      description: log.event_description,
      createdAt: log.created_at,
      severity: log.severity,
      metadata: DataFilter.filterSensitiveData(
        log.metadata || {}, 
        { allowSensitive: false }
      )
    }));

    res.json({
      activity: filteredActivity,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get extension activity error:', error);
    res.status(500).json({ error: 'Failed to fetch extension activity' });
  }
});

module.exports = router;