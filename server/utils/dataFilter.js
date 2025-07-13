const SecurityAudit = require('./securityAudit');

class DataFilter {
  // Define sensitive fields that should never be included in API responses
  static SENSITIVE_FIELDS = new Set([
    'password',
    'password_hash',
    'passwordHash',
    'pwd',
    'secret',
    'token',
    'jwt',
    'session',
    'apiKey',
    'api_key',
    'private_key',
    'privateKey',
    'refresh_token',
    'refreshToken',
    'verification_token',
    'verificationToken',
    'reset_token',
    'resetToken',
    'salt',
    'hash'
  ]);

  // Define fields that require special handling based on context
  static CONTEXT_SENSITIVE_FIELDS = new Set([
    'email',
    'phone',
    'ssn',
    'social_security_number',
    'credit_card',
    'creditCard',
    'bank_account',
    'bankAccount',
    'address',
    'ip_address',
    'ipAddress',
    'user_agent',
    'userAgent',
    'device_info',
    'deviceInfo',
    'location',
    'coordinates',
    'metadata'
  ]);

  // Define fields that should be partially masked
  static MASKABLE_FIELDS = new Set([
    'email',
    'phone',
    'credit_card',
    'creditCard',
    'bank_account',
    'bankAccount',
    'ssn',
    'social_security_number'
  ]);

  /**
   * Filter user data for public API responses
   * @param {Object} userData - Raw user data from database
   * @param {Object} options - Filtering options
   * @returns {Object} - Filtered user data safe for API response
   */
  static filterUserData(userData, options = {}) {
    if (!userData) return userData;

    const {
      includeEmail = false,
      includePhone = false,
      includeSensitiveMetadata = false,
      isOwner = false, // If user is viewing their own data
      requesterRole = 'user'
    } = options;

    // Start with a clean object
    const filtered = {};

    // Always safe fields to include
    const safeFields = [
      'id',
      'username',
      'first_name',
      'firstName',
      'last_name',
      'lastName',
      'profile_picture_url',
      'profilePictureUrl',
      'bio',
      'created_at',
      'createdAt',
      'updated_at',
      'updatedAt',
      'is_verified',
      'isVerified',
      'role',
      'preferences',
      'privacy_settings',
      'privacySettings'
    ];

    // Copy safe fields
    for (const field of safeFields) {
      if (userData.hasOwnProperty(field)) {
        filtered[field] = userData[field];
      }
    }

    // Handle email based on permissions
    if (userData.email) {
      if (isOwner || includeEmail || requesterRole === 'admin') {
        filtered.email = userData.email;
      } else if (options.maskEmail) {
        filtered.email = this.maskEmail(userData.email);
      }
      // Otherwise, email is excluded entirely
    }

    // Handle phone based on permissions
    if (userData.phone) {
      if (isOwner || includePhone || requesterRole === 'admin') {
        filtered.phone = userData.phone;
      } else if (options.maskPhone) {
        filtered.phone = this.maskPhone(userData.phone);
      }
    }

    // Handle metadata and other sensitive fields for admins/owners only
    if (includeSensitiveMetadata && (isOwner || requesterRole === 'admin')) {
      const metadataFields = ['last_login', 'lastLogin', 'login_count', 'loginCount'];
      for (const field of metadataFields) {
        if (userData.hasOwnProperty(field)) {
          filtered[field] = userData[field];
        }
      }
    }

    return filtered;
  }

  /**
   * Filter message data to remove sensitive information
   * @param {Object} messageData - Raw message data
   * @param {Object} options - Filtering options
   * @returns {Object} - Filtered message data
   */
  static filterMessageData(messageData, options = {}) {
    if (!messageData) return messageData;

    const {
      includeModeratorInfo = false,
      includeMetadata = false,
      requesterRole = 'user'
    } = options;

    const filtered = {
      id: messageData.id,
      conversation_id: messageData.conversation_id,
      sender_id: messageData.sender_id,
      content: messageData.content,
      message_type: messageData.message_type,
      created_at: messageData.created_at,
      updated_at: messageData.updated_at,
      is_deleted: messageData.is_deleted,
      parent_message_id: messageData.parent_message_id
    };

    // Include sender information if available (already filtered)
    if (messageData.sender_name) {
      filtered.sender_name = messageData.sender_name;
    }
    if (messageData.sender_username) {
      filtered.sender_username = messageData.sender_username;
    }
    if (messageData.sender_profile_picture) {
      filtered.sender_profile_picture = messageData.sender_profile_picture;
    }

    // Only include moderation info for moderators/admins
    if (includeModeratorInfo && ['moderator', 'admin'].includes(requesterRole)) {
      filtered.safety_score = messageData.safety_score;
      filtered.moderation_status = messageData.moderation_status;
      filtered.is_blocked = messageData.is_blocked;
      
      if (includeMetadata && messageData.flagged_content) {
        filtered.flagged_content = messageData.flagged_content;
      }
    }

    return filtered;
  }

  /**
   * Filter sensitive data from any object recursively
   * @param {Object} data - Object to filter
   * @param {Object} options - Filtering options
   * @returns {Object} - Filtered object
   */
  static filterSensitiveData(data, options = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.filterSensitiveData(item, options));
    }

    const filtered = {};
    const { allowSensitive = false, requesterRole = 'user' } = options;

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      
      // Always exclude sensitive fields
      if (this.SENSITIVE_FIELDS.has(keyLower) || this.SENSITIVE_FIELDS.has(key)) {
        continue;
      }

      // Handle context-sensitive fields
      if (this.CONTEXT_SENSITIVE_FIELDS.has(keyLower) || this.CONTEXT_SENSITIVE_FIELDS.has(key)) {
        if (!allowSensitive && requesterRole !== 'admin') {
          // Only include if explicitly allowed or user is admin
          if (this.MASKABLE_FIELDS.has(keyLower) || this.MASKABLE_FIELDS.has(key)) {
            filtered[key] = this.maskSensitiveValue(key, value);
          }
          continue;
        }
      }

      // Recursively filter nested objects
      if (typeof value === 'object' && value !== null) {
        filtered[key] = this.filterSensitiveData(value, options);
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Mask email addresses
   * @param {string} email - Email to mask
   * @returns {string} - Masked email
   */
  static maskEmail(email) {
    if (!email || typeof email !== 'string') return email;
    
    const [local, domain] = email.split('@');
    if (!domain) return email;
    
    const maskedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '*'.repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone numbers
   * @param {string} phone - Phone number to mask
   * @returns {string} - Masked phone number
   */
  static maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return phone;
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length >= 10) {
      // Show last 4 digits
      const masked = '*'.repeat(digits.length - 4) + digits.slice(-4);
      return masked;
    }
    
    return '*'.repeat(phone.length);
  }

  /**
   * Mask sensitive values based on field type
   * @param {string} fieldName - Name of the field
   * @param {any} value - Value to mask
   * @returns {any} - Masked value
   */
  static maskSensitiveValue(fieldName, value) {
    if (!value || typeof value !== 'string') return value;
    
    const fieldLower = fieldName.toLowerCase();
    
    if (fieldLower.includes('email')) {
      return this.maskEmail(value);
    }
    
    if (fieldLower.includes('phone')) {
      return this.maskPhone(value);
    }
    
    if (fieldLower.includes('credit') || fieldLower.includes('card')) {
      return '*'.repeat(12) + value.slice(-4);
    }
    
    if (fieldLower.includes('ssn') || fieldLower.includes('social')) {
      return '*'.repeat(5) + value.slice(-4);
    }
    
    // Default masking
    return '*'.repeat(Math.min(value.length, 8));
  }

  /**
   * Create a safe response wrapper that automatically filters data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static createResponseFilter(req, res, next) {
    const originalJson = res.json;
    
    res.json = function(data) {
      try {
        // Determine user role and permissions
        const userRole = req.user?.role || 'user';
        const isAuthenticated = !!req.user;
        
        // Filter the response data
        const filteredData = DataFilter.filterSensitiveData(data, {
          allowSensitive: false,
          requesterRole: userRole
        });
        
        // Log data access for sensitive endpoints
        if (req.path.includes('/admin') || req.path.includes('/moderation')) {
          SecurityAudit.logDataAccess(req, `Sensitive data accessed: ${req.path}`);
        }
        
        return originalJson.call(this, filteredData);
      } catch (error) {
        console.error('Response filtering error:', error);
        // Fall back to original response if filtering fails
        return originalJson.call(this, { error: 'Internal server error' });
      }
    };
    
    next();
  }

  /**
   * Validate that response doesn't contain sensitive data
   * @param {Object} data - Data to validate
   * @returns {Object} - Validation result
   */
  static validateResponseSafety(data) {
    const issues = [];
    
    const checkObject = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => checkObject(item, `${path}[${index}]`));
        return;
      }
      
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        const keyLower = key.toLowerCase();
        
        // Check for sensitive fields
        if (this.SENSITIVE_FIELDS.has(keyLower) || this.SENSITIVE_FIELDS.has(key)) {
          issues.push({
            type: 'sensitive_field',
            field: fullPath,
            severity: 'critical',
            message: `Sensitive field '${key}' found in response`
          });
        }
        
        // Check for potential PII patterns in string values
        if (typeof value === 'string') {
          // Email pattern
          if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(value) && !keyLower.includes('email')) {
            issues.push({
              type: 'potential_email',
              field: fullPath,
              severity: 'warning',
              message: `Potential email address found in field '${key}'`
            });
          }
          
          // Phone pattern
          if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(value) && !keyLower.includes('phone')) {
            issues.push({
              type: 'potential_phone',
              field: fullPath,
              severity: 'warning',
              message: `Potential phone number found in field '${key}'`
            });
          }
        }
        
        // Recursively check nested objects
        if (typeof value === 'object' && value !== null) {
          checkObject(value, fullPath);
        }
      }
    };
    
    checkObject(data);
    
    return {
      isSafe: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      criticalIssues: issues.filter(i => i.severity === 'critical'),
      warnings: issues.filter(i => i.severity === 'warning')
    };
  }
}

module.exports = DataFilter;