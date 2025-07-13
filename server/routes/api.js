const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getVersionInfo, hasFeature } = require('../middleware/apiVersioning');
const SecurityAudit = require('../utils/securityAudit');

const router = express.Router();

/**
 * API Management Routes
 * Provides information about API versions, features, and deprecation status
 */

// Get API version information (public endpoint)
router.get('/version', (req, res) => {
  try {
    const versionInfo = getVersionInfo();
    
    // Add current request version information
    const response = {
      ...versionInfo,
      currentRequest: {
        version: req.apiVersion,
        status: req.versionInfo?.status,
        features: req.features,
        deprecated: req.versionInfo?.deprecated || false
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Get version info error:', error);
    res.status(500).json({ error: 'Failed to get version information' });
  }
});

// Get available features for current API version
router.get('/features', (req, res) => {
  try {
    const features = req.features || {};
    
    // Add feature descriptions
    const featureDescriptions = {
      'enhanced_jwt': 'Enhanced JWT tokens with rotation and device tracking',
      'browser_extensions': 'Browser extension authentication and management',
      'advanced_analytics': 'Advanced analytics and reporting features',
      'bulk_operations': 'Bulk operations for data management'
    };

    const response = {
      apiVersion: req.apiVersion,
      features: Object.keys(features).map(feature => ({
        name: feature,
        enabled: features[feature],
        description: featureDescriptions[feature] || 'No description available'
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({ error: 'Failed to get feature information' });
  }
});

// Check if a specific feature is available
router.get('/features/:featureName', (req, res) => {
  try {
    const { featureName } = req.params;
    const isAvailable = hasFeature(req, featureName);

    res.json({
      feature: featureName,
      available: isAvailable,
      apiVersion: req.apiVersion,
      message: isAvailable 
        ? `Feature '${featureName}' is available in ${req.apiVersion}`
        : `Feature '${featureName}' is not available in ${req.apiVersion}`
    });

  } catch (error) {
    console.error('Check feature error:', error);
    res.status(500).json({ error: 'Failed to check feature availability' });
  }
});

// Get API changelog (public endpoint)
router.get('/changelog', (req, res) => {
  try {
    const { version } = req.query;
    
    // Mock changelog data (in production, this would come from a database or file)
    const changelogs = {
      'v1': {
        version: '1.0.0',
        releaseDate: '2024-01-01',
        changes: [
          {
            type: 'feature',
            description: 'Initial API release with basic authentication and user management'
          },
          {
            type: 'feature',
            description: 'Recovery program management endpoints'
          },
          {
            type: 'feature',
            description: 'Community and messaging features'
          }
        ]
      },
      'v2': {
        version: '2.0.0',
        releaseDate: '2024-06-01',
        changes: [
          {
            type: 'breaking',
            description: 'Enhanced JWT authentication with token rotation'
          },
          {
            type: 'feature',
            description: 'Browser extension authentication support'
          },
          {
            type: 'feature',
            description: 'Advanced analytics and reporting'
          },
          {
            type: 'improvement',
            description: 'Enhanced security headers and monitoring'
          },
          {
            type: 'breaking',
            description: 'Standardized error response format'
          }
        ]
      }
    };

    if (version && changelogs[version]) {
      res.json({
        changelog: changelogs[version]
      });
    } else {
      res.json({
        changelogs: changelogs,
        currentVersion: req.apiVersion
      });
    }

  } catch (error) {
    console.error('Get changelog error:', error);
    res.status(500).json({ error: 'Failed to get changelog' });
  }
});

// Get migration guide for version upgrade
router.get('/migration/:fromVersion/:toVersion', (req, res) => {
  try {
    const { fromVersion, toVersion } = req.params;

    // Mock migration guides (in production, this would be more comprehensive)
    const migrationGuides = {
      'v1-to-v2': {
        title: 'Migrating from API v1 to v2',
        overview: 'API v2 introduces enhanced security features and breaking changes in authentication.',
        breakingChanges: [
          {
            area: 'Authentication',
            change: 'JWT tokens now use enhanced format with rotation',
            action: 'Update token handling to support refresh token rotation',
            example: {
              old: 'Authorization: Bearer <access_token>',
              new: 'Authorization: Bearer <access_token> (with automatic refresh)'
            }
          },
          {
            area: 'Error Responses',
            change: 'Standardized error format',
            action: 'Update error handling to use new error object structure',
            example: {
              old: '{ "error": "message" }',
              new: '{ "error": { "code": "ERROR_CODE", "message": "description" } }'
            }
          }
        ],
        newFeatures: [
          'Browser extension authentication',
          'Advanced session management',
          'Enhanced security monitoring'
        ],
        timeline: '6 months deprecation period for v1',
        resources: [
          'https://docs.recovr.app/migration/v1-to-v2',
          'https://docs.recovr.app/api/v2',
          'https://github.com/recovr/migration-examples'
        ]
      }
    };

    const migrationKey = `${fromVersion}-to-${toVersion}`;
    const guide = migrationGuides[migrationKey];

    if (guide) {
      res.json({
        migration: guide
      });
    } else {
      res.status(404).json({
        error: 'Migration guide not found',
        availableGuides: Object.keys(migrationGuides)
      });
    }

  } catch (error) {
    console.error('Get migration guide error:', error);
    res.status(500).json({ error: 'Failed to get migration guide' });
  }
});

// Get API health and status (includes version-specific health checks)
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: req.apiVersion,
      versionStatus: req.versionInfo?.status,
      features: req.features,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Add deprecation warning if applicable
    if (req.versionInfo?.deprecated) {
      health.deprecationWarning = {
        message: `API version ${req.apiVersion} is deprecated`,
        deprecationDate: req.versionInfo.deprecationDate,
        sunsetDate: req.versionInfo.sunsetDate,
        migrationGuide: `https://docs.recovr.app/migration/${req.apiVersion}`
      };
    }

    res.json(health);

  } catch (error) {
    console.error('API health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin endpoint: Get API usage statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    // Mock usage statistics (in production, this would come from analytics)
    const stats = {
      versionUsage: {
        'v1': {
          requestCount: 15420,
          uniqueUsers: 1240,
          percentage: 75.2
        },
        'v2': {
          requestCount: 5080,
          uniqueUsers: 420,
          percentage: 24.8
        }
      },
      deprecationStatus: {
        'v1': {
          deprecated: false,
          usersToMigrate: 0
        }
      },
      trends: {
        v1Usage: 'declining',
        v2Adoption: 'growing',
        migrationRate: '15% per month'
      },
      topEndpoints: [
        { endpoint: '/api/auth/login', version: 'v1', requestCount: 3420 },
        { endpoint: '/api/users/profile', version: 'v1', requestCount: 2810 },
        { endpoint: '/api/programs', version: 'v2', requestCount: 1650 }
      ]
    };

    await SecurityAudit.logDataAccess(req, 'API usage statistics accessed');

    res.json({
      statistics: stats,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get API stats error:', error);
    res.status(500).json({ error: 'Failed to get API statistics' });
  }
});

module.exports = router;