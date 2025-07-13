# RecovR API Versioning Guide

## Overview

The RecovR API uses semantic versioning to manage API evolution and ensure backward compatibility. This system allows for smooth transitions between API versions while providing clear deprecation paths.

## Version Strategy

### Current Versions

- **v1** (Stable) - Current production version
- **v2** (Beta) - Next generation with enhanced features

### Version Lifecycle

1. **Development** - New features in development
2. **Beta** - Feature complete, testing phase
3. **Stable** - Production ready, fully supported
4. **Deprecated** - Marked for sunset, migration encouraged
5. **Sunset** - No longer supported

## Version Detection

The API supports multiple methods for specifying the version (in priority order):

### 1. Accept Header (Recommended)
```http
Accept: application/vnd.recovr.v2+json
```

### 2. API-Version Header
```http
API-Version: v2
```

### 3. Query Parameter
```http
GET /api/auth/login?version=v2
```

### 4. URL Path
```http
GET /api/v2/auth/login
```

### 5. Default Version
If no version is specified, the API defaults to **v1**.

## API Endpoints

### Version Information

#### Get Version Info
```http
GET /api/version
```

**Response:**
```json
{
  "versions": {
    "v1": {
      "version": "1.0.0",
      "status": "stable",
      "releaseDate": "2024-01-01",
      "deprecated": false,
      "changelogUrl": "https://docs.recovr.app/changelog/v1"
    },
    "v2": {
      "version": "2.0.0",
      "status": "beta",
      "releaseDate": "2024-06-01",
      "deprecated": false,
      "changelogUrl": "https://docs.recovr.app/changelog/v2"
    }
  },
  "defaultVersion": "v1",
  "minimumVersion": "v1",
  "currentRequest": {
    "version": "v1",
    "status": "stable",
    "features": {
      "enhanced_jwt": false,
      "browser_extensions": false
    }
  }
}
```

#### Get Available Features
```http
GET /api/features
```

**Response:**
```json
{
  "apiVersion": "v2",
  "features": [
    {
      "name": "enhanced_jwt",
      "enabled": true,
      "description": "Enhanced JWT tokens with rotation and device tracking"
    },
    {
      "name": "browser_extensions",
      "enabled": true,
      "description": "Browser extension authentication and management"
    }
  ]
}
```

#### Check Specific Feature
```http
GET /api/features/enhanced_jwt
```

**Response:**
```json
{
  "feature": "enhanced_jwt",
  "available": true,
  "apiVersion": "v2",
  "message": "Feature 'enhanced_jwt' is available in v2"
}
```

### API Health
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "v1",
  "versionStatus": "stable",
  "features": {
    "enhanced_jwt": false,
    "browser_extensions": false
  },
  "uptime": 3600.5,
  "environment": "production"
}
```

### Changelog
```http
GET /api/changelog?version=v2
```

**Response:**
```json
{
  "changelog": {
    "version": "2.0.0",
    "releaseDate": "2024-06-01",
    "changes": [
      {
        "type": "breaking",
        "description": "Enhanced JWT authentication with token rotation"
      },
      {
        "type": "feature",
        "description": "Browser extension authentication support"
      }
    ]
  }
}
```

### Migration Guide
```http
GET /api/migration/v1/v2
```

**Response:**
```json
{
  "migration": {
    "title": "Migrating from API v1 to v2",
    "overview": "API v2 introduces enhanced security features...",
    "breakingChanges": [
      {
        "area": "Authentication",
        "change": "JWT tokens now use enhanced format",
        "action": "Update token handling",
        "example": {
          "old": "{ accessToken: 'token' }",
          "new": "{ accessToken: 'token', refreshToken: 'refresh' }"
        }
      }
    ],
    "resources": [
      "https://docs.recovr.app/migration/v1-to-v2"
    ]
  }
}
```

## Version Differences

### API v1 (Current)

**Features:**
- Basic JWT authentication
- Standard user management
- Recovery program tracking
- Community features

**Authentication Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John"
  },
  "accessToken": "jwt_token",
  "expiresIn": 3600
}
```

### API v2 (Beta)

**New Features:**
- Enhanced JWT with token rotation
- Browser extension support
- Advanced session management
- Enhanced security monitoring

**Authentication Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "security": {
      "emailVerified": true,
      "twoFactorEnabled": false
    }
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "sessionId": "session_uuid",
  "expiresIn": 900,
  "security": {
    "tokenRotationEnabled": true,
    "sessionTrackingEnabled": true
  }
}
```

## Response Headers

All API responses include version information in headers:

```http
API-Version: v2
API-Version-Status: beta
API-Supported-Versions: v1, v2
```

### Deprecation Headers (when applicable)

```http
API-Deprecation-Warning: true
API-Deprecation-Date: 2024-07-01
API-Sunset-Date: 2024-12-31
API-Migration-Guide: https://docs.recovr.app/migration/v1-to-v2
```

## Response Transformations

### V1 Format (Legacy)
```json
{
  "success": true,
  "data": { ... },
  "_meta": {
    "apiVersion": "v1",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### V2 Format (Enhanced)
```json
{
  "data": { ... },
  "_meta": {
    "apiVersion": "v2",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Responses

#### V1 Format
```json
{
  "success": false,
  "error": "Error message"
}
```

#### V2 Format
```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials provided",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Version-Specific Routes

Some endpoints are only available in specific API versions:

```javascript
// v2+ only endpoints
GET /api/auth/sessions/stats  // Requires v2 or higher
GET /api/extension/*          // Browser extension features (v2+)

// Version-specific features
if (apiVersion >= 'v2') {
  // Enhanced JWT features available
  // Browser extension support
  // Advanced analytics
}
```

## Client Implementation

### JavaScript/Node.js Example

```javascript
class RecovRAPIClient {
  constructor(apiVersion = 'v1') {
    this.apiVersion = apiVersion;
    this.baseURL = 'https://api.recovr.app';
  }

  async makeRequest(endpoint, options = {}) {
    const headers = {
      'Accept': `application/vnd.recovr.${this.apiVersion}+json`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers
    });

    // Check for deprecation warnings
    const deprecationWarning = response.headers.get('API-Deprecation-Warning');
    if (deprecationWarning === 'true') {
      console.warn(`API ${this.apiVersion} is deprecated. Migration guide: ${response.headers.get('API-Migration-Guide')}`);
    }

    return response.json();
  }

  async login(email, password) {
    return this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async getFeatures() {
    return this.makeRequest('/api/features');
  }
}

// Usage
const client = new RecovRAPIClient('v2');
const result = await client.login('user@example.com', 'password');
```

### cURL Examples

```bash
# Using Accept header (recommended)
curl -H "Accept: application/vnd.recovr.v2+json" \
  https://api.recovr.app/api/auth/login

# Using API-Version header
curl -H "API-Version: v2" \
  https://api.recovr.app/api/auth/login

# Using query parameter
curl "https://api.recovr.app/api/auth/login?version=v2"

# Check available features
curl -H "API-Version: v2" \
  https://api.recovr.app/api/features
```

## Migration Strategy

### Phase 1: Preparation (Now)
- Review API v2 documentation
- Identify breaking changes affecting your application
- Test with API v2 in development environment

### Phase 2: Implementation (Next 2 months)
- Update authentication handling for enhanced JWT
- Implement new error handling format
- Test all endpoints with v2

### Phase 3: Deployment (Month 3-4)
- Deploy v2 integration to staging
- Gradual rollout to production
- Monitor for issues

### Phase 4: Cleanup (Month 5-6)
- Remove v1 dependencies
- Update to use v2-specific features
- Complete migration before v1 deprecation

## Best Practices

### 1. Always Specify Version
```javascript
// Good
headers: { 'Accept': 'application/vnd.recovr.v2+json' }

// Avoid relying on defaults
headers: { 'Accept': 'application/json' }
```

### 2. Handle Deprecation Warnings
```javascript
if (response.headers['api-deprecation-warning']) {
  // Log warning and plan migration
  console.warn('API version deprecated:', response.headers['api-sunset-date']);
}
```

### 3. Feature Detection
```javascript
const features = await client.getFeatures();
if (features.find(f => f.name === 'enhanced_jwt' && f.enabled)) {
  // Use enhanced JWT features
}
```

### 4. Error Handling
```javascript
// Handle both v1 and v2 error formats
function handleError(response) {
  if (response.error?.code) {
    // v2 format
    return response.error;
  } else if (response.error) {
    // v1 format
    return { message: response.error };
  }
}
```

## Support and Resources

- **Documentation**: https://docs.recovr.app/api
- **Migration Guides**: https://docs.recovr.app/migration
- **Changelog**: https://docs.recovr.app/changelog
- **Support**: dev-support@recovr.app
- **Status Page**: https://status.recovr.app

## FAQ

**Q: How long will v1 be supported?**
A: v1 will be supported for at least 6 months after v2 becomes stable.

**Q: Can I use both v1 and v2 in the same application?**
A: Yes, you can make requests to different versions as needed during migration.

**Q: Will my API keys work with v2?**
A: Yes, existing API keys are compatible with all versions.

**Q: How do I know when v2 becomes stable?**
A: Monitor the `/api/version` endpoint or subscribe to our changelog notifications.