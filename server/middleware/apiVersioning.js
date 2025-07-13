const SecurityAudit = require('../utils/securityAudit');

/**
 * API Versioning and Deprecation Handling Middleware
 * Supports multiple API versions, deprecation warnings, and migration assistance
 */

class APIVersionManager {
  constructor() {
    // Current supported API versions
    this.versions = {
      'v1': {
        version: '1.0.0',
        status: 'stable',
        releaseDate: '2024-01-01',
        deprecated: false,
        deprecationDate: null,
        sunsetDate: null,
        changelogUrl: 'https://docs.recovr.app/changelog/v1'
      },
      'v2': {
        version: '2.0.0',
        status: 'beta',
        releaseDate: '2024-06-01',
        deprecated: false,
        deprecationDate: null,
        sunsetDate: null,
        changelogUrl: 'https://docs.recovr.app/changelog/v2'
      }
    };

    // Default version if none specified
    this.defaultVersion = 'v1';
    
    // Minimum supported version
    this.minimumVersion = 'v1';

    // Version-specific feature flags
    this.features = {
      'v1': {
        'enhanced_jwt': false,
        'browser_extensions': false,
        'advanced_analytics': false,
        'bulk_operations': false
      },
      'v2': {
        'enhanced_jwt': true,
        'browser_extensions': true,
        'advanced_analytics': true,
        'bulk_operations': true
      }
    };

    // Breaking changes between versions
    this.breakingChanges = {
      'v2': [
        'Authentication tokens now use enhanced JWT format',
        'User profile response structure changed',
        'Error response format standardized',
        'Date formats now ISO 8601 only'
      ]
    };
  }

  /**
   * Main versioning middleware
   */
  versionMiddleware = (req, res, next) => {
    // Extract version from various sources
    const version = this.extractVersion(req);
    
    // Validate and set version
    const versionInfo = this.validateVersion(version);
    
    if (!versionInfo.valid) {
      return res.status(400).json({
        error: 'Invalid API version',
        message: versionInfo.message,
        supportedVersions: Object.keys(this.versions),
        currentVersion: this.defaultVersion,
        documentation: 'https://docs.recovr.app/api-versioning'
      });
    }

    // Set version information on request
    req.apiVersion = versionInfo.version;
    req.versionInfo = this.versions[versionInfo.version];
    req.features = this.features[versionInfo.version] || {};

    // Add version headers to response
    res.set({
      'API-Version': versionInfo.version,
      'API-Version-Status': req.versionInfo.status,
      'API-Supported-Versions': Object.keys(this.versions).join(', ')
    });

    // Handle deprecated versions
    if (req.versionInfo.deprecated) {
      this.handleDeprecatedVersion(req, res);
    }

    // Log version usage for analytics
    this.logVersionUsage(req, versionInfo.version);

    next();
  };

  /**
   * Extract API version from request
   */
  extractVersion(req) {
    // Priority order for version detection:
    // 1. Accept header (Accept: application/vnd.recovr.v2+json)
    // 2. Custom header (API-Version: v2)
    // 3. Query parameter (?version=v2)
    // 4. URL path (/api/v2/...)
    // 5. Default version

    // 1. Check Accept header
    const acceptHeader = req.get('Accept');
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/application\/vnd\.recovr\.v(\d+)\+json/);
      if (versionMatch) {
        return `v${versionMatch[1]}`;
      }
    }

    // 2. Check API-Version header
    const versionHeader = req.get('API-Version');
    if (versionHeader) {
      return versionHeader;
    }

    // 3. Check query parameter
    if (req.query.version) {
      return req.query.version;
    }

    // 4. Check URL path
    const pathMatch = req.path.match(/^\/api\/v(\d+)\//);
    if (pathMatch) {
      return `v${pathMatch[1]}`;
    }

    // 5. Return default version
    return this.defaultVersion;
  }

  /**
   * Validate API version
   */
  validateVersion(version) {
    // Normalize version format
    const normalizedVersion = version.toLowerCase().startsWith('v') ? version.toLowerCase() : `v${version}`;

    // Check if version exists
    if (!this.versions[normalizedVersion]) {
      return {
        valid: false,
        message: `API version '${version}' is not supported`,
        version: null
      };
    }

    // Check if version is below minimum supported
    const versionNumber = parseInt(normalizedVersion.substring(1));
    const minimumNumber = parseInt(this.minimumVersion.substring(1));
    
    if (versionNumber < minimumNumber) {
      return {
        valid: false,
        message: `API version '${version}' is no longer supported. Minimum version is ${this.minimumVersion}`,
        version: null
      };
    }

    return {
      valid: true,
      version: normalizedVersion,
      message: null
    };
  }

  /**
   * Handle deprecated version warnings
   */
  handleDeprecatedVersion(req, res) {
    const versionInfo = req.versionInfo;
    
    // Add deprecation headers
    res.set({
      'API-Deprecation-Warning': 'true',
      'API-Deprecation-Date': versionInfo.deprecationDate,
      'API-Sunset-Date': versionInfo.sunsetDate,
      'API-Migration-Guide': `https://docs.recovr.app/migration/${req.apiVersion}-to-${this.defaultVersion}`
    });

    // Log deprecated version usage
    SecurityAudit.logEvent({
      userId: req.user?.id,
      eventType: 'deprecated_api_usage',
      eventDescription: `Deprecated API version used: ${req.apiVersion}`,
      severity: 'warning',
      ipAddress: SecurityAudit.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        apiVersion: req.apiVersion,
        endpoint: req.path,
        method: req.method,
        deprecationDate: versionInfo.deprecationDate,
        sunsetDate: versionInfo.sunsetDate
      }
    });
  }

  /**
   * Log version usage for analytics
   */
  logVersionUsage(req, version) {
    // In production, this could feed into analytics systems
    const usageData = {
      version: version,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      userId: req.user?.id
    };

    // Log to console for now (in production, send to analytics service)
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Usage: ${version} ${req.method} ${req.path}`);
    }
  }

  /**
   * Version-specific response transformer
   */
  transformResponse = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      try {
        // Transform data based on API version
        const transformedData = apiVersionManager.transformDataForVersion(data, req.apiVersion, req.path);
        
        // Add version metadata to response
        if (transformedData && typeof transformedData === 'object' && !Array.isArray(transformedData)) {
          transformedData._meta = {
            apiVersion: req.apiVersion,
            timestamp: new Date().toISOString(),
            ...(req.versionInfo.deprecated && {
              deprecationWarning: {
                message: `API version ${req.apiVersion} is deprecated`,
                deprecationDate: req.versionInfo.deprecationDate,
                sunsetDate: req.versionInfo.sunsetDate,
                migrationGuide: `https://docs.recovr.app/migration/${req.apiVersion}`
              }
            })
          };
        }
        
        return originalJson.call(this, transformedData);
      } catch (error) {
        console.error('Response transformation error:', error);
        return originalJson.call(this, data);
      }
    };
    
    next();
  };

  /**
   * Transform data based on API version
   */
  transformDataForVersion(data, version, endpoint) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Version-specific transformations
    switch (version) {
      case 'v1':
        return this.transformToV1(data, endpoint);
      case 'v2':
        return this.transformToV2(data, endpoint);
      default:
        return data;
    }
  }

  /**
   * Transform data to v1 format (legacy compatibility)
   */
  transformToV1(data, endpoint) {
    // V1 specific transformations
    if (endpoint.includes('/auth/') && data.user) {
      // V1 user format
      return {
        ...data,
        user: {
          ...data.user,
          // V1 used camelCase consistently
          profilePicture: data.user.profilePictureUrl || data.user.profile_picture_url,
          createdAt: data.user.created_at || data.user.createdAt
        }
      };
    }

    // Transform error responses for V1
    if (data.error) {
      return {
        success: false,
        error: data.error,
        message: data.message
      };
    }

    return data;
  }

  /**
   * Transform data to v2 format (current/enhanced format)
   */
  transformToV2(data, endpoint) {
    // V2 specific transformations
    if (endpoint.includes('/auth/') && data.user) {
      // V2 enhanced user format with additional metadata
      return {
        ...data,
        user: {
          ...data.user,
          // V2 includes additional security metadata
          ...(data.user.id && {
            security: {
              emailVerified: data.user.isVerified || data.user.is_verified,
              twoFactorEnabled: false, // Future feature
              lastPasswordChange: data.user.passwordChangedAt || data.user.password_changed_at
            }
          })
        }
      };
    }

    // V2 standard error format
    if (data.error) {
      return {
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || data.error,
          timestamp: new Date().toISOString(),
          ...(data.details && { details: data.details })
        }
      };
    }

    return data;
  }

  /**
   * Feature flag checker
   */
  hasFeature(req, featureName) {
    return req.features && req.features[featureName] === true;
  }

  /**
   * Deprecate a version
   */
  deprecateVersion(version, deprecationDate, sunsetDate) {
    if (this.versions[version]) {
      this.versions[version].deprecated = true;
      this.versions[version].deprecationDate = deprecationDate;
      this.versions[version].sunsetDate = sunsetDate;
      this.versions[version].status = 'deprecated';
      
      console.log(`API version ${version} marked as deprecated. Sunset date: ${sunsetDate}`);
    }
  }

  /**
   * Get version information
   */
  getVersionInfo() {
    return {
      versions: this.versions,
      defaultVersion: this.defaultVersion,
      minimumVersion: this.minimumVersion,
      currentTime: new Date().toISOString()
    };
  }

  /**
   * Version-specific route wrapper
   */
  versionedRoute(minVersion, maxVersion = null) {
    return (req, res, next) => {
      const currentVersionNumber = parseInt(req.apiVersion.substring(1));
      const minVersionNumber = parseInt(minVersion.substring(1));
      const maxVersionNumber = maxVersion ? parseInt(maxVersion.substring(1)) : Infinity;

      if (currentVersionNumber < minVersionNumber || currentVersionNumber > maxVersionNumber) {
        const message = maxVersion 
          ? `This endpoint requires API version ${minVersion} to ${maxVersion}`
          : `This endpoint requires API version ${minVersion} or higher`;

        return res.status(400).json({
          error: 'Unsupported API version for this endpoint',
          message: message,
          currentVersion: req.apiVersion,
          requiredVersion: maxVersion ? `${minVersion} - ${maxVersion}` : `${minVersion}+`
        });
      }

      next();
    };
  }
}

// Create singleton instance
const apiVersionManager = new APIVersionManager();

// Example: Deprecate v1 after 6 months (this would be called when ready)
// apiVersionManager.deprecateVersion('v1', '2024-07-01', '2024-12-31');

module.exports = {
  APIVersionManager,
  apiVersionManager,
  versionMiddleware: apiVersionManager.versionMiddleware,
  transformResponse: apiVersionManager.transformResponse,
  hasFeature: apiVersionManager.hasFeature.bind(apiVersionManager),
  versionedRoute: apiVersionManager.versionedRoute.bind(apiVersionManager),
  getVersionInfo: apiVersionManager.getVersionInfo.bind(apiVersionManager)
};