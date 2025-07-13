# Browser Extension Integration Guide

## Overview

The RecovR platform provides secure authentication and API access for browser extensions that support addiction recovery goals. This system allows extensions to:

- Block harmful content based on user preferences
- Track and report user progress
- Provide crisis intervention alerts
- Sync with the main RecovR platform

## Security Features

- **Secure Registration**: Extensions must be registered with manifest validation
- **Token-based Authentication**: Uses secure extension tokens and JWT
- **Fingerprint Verification**: Validates extension integrity
- **Permission Review**: Sensitive permissions require manual approval
- **Activity Logging**: All extension activities are logged for transparency

## Extension Registration Process

1. User must be logged into RecovR platform
2. Extension calls `/api/extension/register` with manifest and metadata
3. System validates manifest and permissions
4. Extension receives secure token (if approved immediately)
5. Extensions with sensitive permissions require manual review

## API Endpoints

### Register Extension
```
POST /api/extension/register
```

**Headers:**
```
Authorization: Bearer <user_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "extensionId": "extension-id-from-browser",
  "manifest": {
    "name": "RecovR Content Blocker",
    "version": "1.0.0",
    "description": "Blocks harmful content to support recovery",
    "permissions": ["storage", "activeTab"],
    "content_scripts": [...],
    "background": {...}
  },
  "browserInfo": {
    "browser": "chrome",
    "version": "118.0.0.0",
    "os": "Windows"
  },
  "extensionMetadata": {
    "developer": "RecovR Team",
    "supportEmail": "support@recovr.app"
  }
}
```

**Response (Success):**
```json
{
  "message": "Extension registered successfully",
  "registrationId": "uuid",
  "extensionToken": "secure-token-here",
  "status": "active"
}
```

**Response (Requires Review):**
```json
{
  "message": "Extension registered but requires manual review",
  "registrationId": "uuid",
  "status": "pending_review",
  "requiresReview": true
}
```

### Authenticate Extension
```
POST /api/extension/authenticate
```

**Request Body:**
```json
{
  "extensionId": "extension-id-from-browser",
  "extensionToken": "secure-token-from-registration",
  "fingerprint": "optional-integrity-check-hash"
}
```

**Response:**
```json
{
  "message": "Extension authenticated successfully",
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "sessionId": "session-uuid",
  "user": {
    "id": "user-uuid",
    "role": "user"
  }
}
```

### List User Extensions
```
GET /api/extension/list
```

**Headers:**
```
Authorization: Bearer <user_jwt_token>
```

**Response:**
```json
{
  "extensions": [
    {
      "id": "registration-uuid",
      "extensionId": "browser-extension-id",
      "name": "Extension Name",
      "version": "1.0.0",
      "description": "Extension description",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastAuthAt": "2024-01-15T10:30:00Z",
      "requiresReview": false
    }
  ]
}
```

### Revoke Extension
```
POST /api/extension/{extensionId}/revoke
```

**Headers:**
```
Authorization: Bearer <user_jwt_token>
```

## Sample Extension Implementation

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "RecovR Content Blocker",
  "version": "1.0.0",
  "description": "Blocks harmful content to support addiction recovery",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

### background.js
```javascript
// RecovR Extension Background Script
class RecovRExtension {
  constructor() {
    this.apiBase = 'https://api.recovr.app';
    this.extensionToken = null;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async initialize() {
    // Load stored tokens
    const storage = await chrome.storage.local.get([
      'extensionToken', 
      'accessToken', 
      'refreshToken'
    ]);
    
    this.extensionToken = storage.extensionToken;
    this.accessToken = storage.accessToken;
    this.refreshToken = storage.refreshToken;
    
    if (!this.extensionToken) {
      console.log('Extension not registered. User must register through RecovR website.');
      return;
    }
    
    // Authenticate if we have token but no access token
    if (this.extensionToken && !this.accessToken) {
      await this.authenticate();
    }
  }

  async register(userJWT) {
    const manifest = chrome.runtime.getManifest();
    const extensionId = chrome.runtime.id;
    
    try {
      const response = await fetch(`${this.apiBase}/api/extension/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userJWT}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extensionId: extensionId,
          manifest: manifest,
          browserInfo: {
            browser: 'chrome',
            version: navigator.appVersion,
            os: navigator.platform
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.extensionToken) {
        this.extensionToken = data.extensionToken;
        await chrome.storage.local.set({ 
          extensionToken: this.extensionToken 
        });
        
        console.log('Extension registered successfully');
        return true;
      } else {
        console.error('Registration failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  async authenticate() {
    if (!this.extensionToken) {
      throw new Error('Extension not registered');
    }
    
    const extensionId = chrome.runtime.id;
    
    try {
      const response = await fetch(`${this.apiBase}/api/extension/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extensionId: extensionId,
          extensionToken: this.extensionToken
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        
        await chrome.storage.local.set({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken
        });
        
        console.log('Extension authenticated successfully');
        return true;
      } else {
        console.error('Authentication failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  async makeAuthenticatedRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      await this.authenticate();
    }
    
    const response = await fetch(`${this.apiBase}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Handle token expiration
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry the request
        return fetch(`${this.apiBase}${endpoint}`, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    
    return response;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.apiBase}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        
        await chrome.storage.local.set({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken
        });
        
        return true;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
    
    return false;
  }

  async getUserBlockedContent() {
    const response = await this.makeAuthenticatedRequest('/api/blocker/blocked-content');
    
    if (response.ok) {
      const data = await response.json();
      return data.blockedContent;
    }
    
    return [];
  }

  async reportBlockedAttempt(url, reason) {
    await this.makeAuthenticatedRequest('/api/blocker/check', {
      method: 'POST',
      body: JSON.stringify({
        url: url,
        keywords: [reason]
      })
    });
  }
}

// Initialize extension
const recovrExtension = new RecovRExtension();
recovrExtension.initialize();

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkBlocking') {
    recovrExtension.getUserBlockedContent()
      .then(blockedContent => {
        sendResponse({ blockedContent });
      });
    return true; // Async response
  }
});
```

## Security Considerations

1. **Token Storage**: Store extension tokens securely using browser's encrypted storage
2. **HTTPS Only**: All API calls must use HTTPS
3. **Token Rotation**: Implement proper JWT token refresh logic
4. **Permission Minimization**: Request only necessary browser permissions
5. **Content Validation**: Validate all data received from the API
6. **Error Handling**: Implement proper error handling for network failures

## Testing

Use the provided test endpoints to verify your extension integration:

```javascript
// Test registration (requires user to be logged in)
await recovrExtension.register(userJWTToken);

// Test authentication
await recovrExtension.authenticate();

// Test API access
const blockedContent = await recovrExtension.getUserBlockedContent();
```

## Support

For technical support with browser extension integration:
- Email: dev-support@recovr.app
- Documentation: https://docs.recovr.app/extensions
- GitHub Issues: https://github.com/recovr/browser-extensions