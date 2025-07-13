# RecovR Content Blocker - Browser Extension

A browser extension that integrates with the RecovR platform to provide real-time content blocking for addiction recovery support.

## Features

- **Real-time Content Blocking**: Blocks websites, keywords, and content categories based on user preferences
- **Recovery-Focused Design**: Motivational blocked pages with recovery quotes and progress tracking
- **Crisis Support Integration**: Emergency help links and crisis detection
- **Secure Authentication**: Integrates with RecovR platform authentication
- **Progress Tracking**: Shows blocking statistics and recovery milestones
- **Customizable Blocking Levels**: Lenient, moderate, and strict blocking options

## Files Structure

```
browser-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker for background processes
├── content.js            # Content script for page analysis
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── blocked.html          # Page shown when content is blocked
├── rules.json            # Default blocking rules
├── icons/                # Extension icons (16x16 to 128x128)
└── README.md             # This file
```

## Installation

### Development Installation

1. **Prepare the Extension**:
   ```bash
   cd my-recovr-app/browser-extension
   ```

2. **Add Icons** (create these in an `icons/` folder):
   - `icon16.png` (16x16)
   - `icon32.png` (32x32) 
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)
   - `icon-active16.png` through `icon-active128.png` (for active state)

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `browser-extension` folder

4. **Configure Backend**:
   - Ensure the RecovR backend is running on `http://localhost:5000`
   - Update API URLs in `background.js` for production

### Production Installation

For production deployment:

1. Update API URLs in `background.js` to production endpoints
2. Create a ZIP file of the extension folder
3. Submit to Chrome Web Store or distribute as enterprise policy

## Configuration

### API Integration

The extension connects to the RecovR backend API. Update these URLs in `background.js`:

```javascript
const API_BASE_URL = 'https://your-production-api.com/api';
```

### Blocking Rules

Default blocking rules are defined in `rules.json`. The extension also dynamically updates rules based on user preferences from the RecovR platform.

### Permissions

The extension requires these permissions (defined in `manifest.json`):

- `storage` - Store user preferences and authentication tokens
- `activeTab` - Access current tab for content analysis
- `declarativeNetRequest` - Block websites using Chrome's native blocking API
- `background` - Run background service worker
- `tabs` - Monitor tab changes
- `alarms` - Periodic sync with RecovR API
- `notifications` - Show blocking notifications
- `<all_urls>` - Monitor all websites for blocking

## Security Features

### Content Analysis
- Real-time page content scanning for trigger keywords
- Form submission monitoring
- Dynamic content detection via mutation observers

### Authentication
- Secure token-based authentication with RecovR platform
- Automatic token refresh
- Secure storage of user credentials

### Privacy Protection
- Local processing of content analysis when possible
- Minimal data transmission to servers
- User data encrypted in transit

## Recovery Features

### Motivational Blocking Pages
- Recovery-focused quotes and messages
- Progress tracking display
- Safe space recommendations
- Crisis support access

### Emergency Support
- Automatic crisis detection based on blocking frequency
- Direct links to crisis support resources
- Emergency contact information

### Progress Tracking
- Daily/weekly/monthly sobriety counters
- Blocking statistics
- Recovery milestone celebrations

## Development

### Testing

1. **Load extension in development mode**
2. **Test blocking functionality**:
   - Try visiting test URLs with blocked keywords
   - Verify redirect to blocked.html
   - Test popup interface

3. **Test authentication**:
   - Sign in through popup
   - Verify token storage
   - Test sync functionality

### Debugging

- Use Chrome DevTools for popup debugging
- Check background script logs in Extensions page
- Monitor network requests in DevTools

### Building for Production

1. Update API URLs to production
2. Optimize images and remove development logs
3. Test with production RecovR instance
4. Package for distribution

## Browser Compatibility

- **Chrome**: Full support (primary target)
- **Edge**: Full support (Chromium-based)
- **Firefox**: Requires Manifest V2 adaptation
- **Safari**: Requires significant adaptation

## API Integration

The extension integrates with these RecovR API endpoints:

- `GET /api/auth/user` - Verify authentication
- `GET /api/blocker/blocked-content` - Fetch user's blocked content
- `GET /api/blocker/sessions` - Get active blocking sessions
- `POST /api/blocker/check` - Log blocking attempts
- `GET /api/blocker/analytics` - Fetch blocking statistics

## Privacy Policy

This extension:
- Processes content locally when possible
- Only sends necessary data to RecovR servers
- Stores authentication tokens securely
- Does not track browsing history beyond blocking events
- Complies with user privacy preferences

## Support

For technical support or bug reports:
1. Check the RecovR platform support section
2. Review extension permissions and settings
3. Contact RecovR support team with extension logs

## License

This extension is part of the RecovR platform and follows the same licensing terms.