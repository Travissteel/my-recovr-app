// RecovR Content Blocker - Background Service Worker

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';  // Change to production URL
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL = 5 * 60 * 1000;  // 5 minutes

// State management
let isAuthenticated = false;
let userToken = null;
let blockedContent = [];
let activeSessions = [];
let lastSyncTime = 0;

// Initialize extension
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);

async function initialize() {
  console.log('RecovR Content Blocker initialized');
  
  // Load stored data
  await loadStoredData();
  
  // Set up periodic sync
  chrome.alarms.create('syncBlocks', { periodInMinutes: 30 });
  chrome.alarms.create('sessionCheck', { periodInMinutes: 5 });
  
  // Sync with server if authenticated
  if (isAuthenticated) {
    await syncWithServer();
  }
  
  // Set up badge
  updateBadge();
}

// Load data from storage
async function loadStoredData() {
  try {
    const data = await chrome.storage.local.get([
      'userToken', 'blockedContent', 'activeSessions', 'lastSyncTime'
    ]);
    
    userToken = data.userToken || null;
    isAuthenticated = !!userToken;
    blockedContent = data.blockedContent || [];
    activeSessions = data.activeSessions || [];
    lastSyncTime = data.lastSyncTime || 0;
    
    console.log('Loaded data:', { 
      authenticated: isAuthenticated, 
      blockedItems: blockedContent.length,
      activeSessions: activeSessions.length 
    });
  } catch (error) {
    console.error('Error loading stored data:', error);
  }
}

// Sync with RecovR server
async function syncWithServer() {
  if (!isAuthenticated || !userToken) return;
  
  try {
    console.log('Syncing with RecovR server...');
    
    // Fetch user's blocked content
    const response = await fetch(`${API_BASE_URL}/blocker/blocked-content`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      blockedContent = data.blockedContent.filter(item => item.is_active);
      
      // Update storage
      await chrome.storage.local.set({
        blockedContent,
        lastSyncTime: Date.now()
      });
      
      // Update blocking rules
      await updateBlockingRules();
      
      console.log(`Synced ${blockedContent.length} blocked items`);
    } else if (response.status === 401) {
      // Token expired
      await handleAuthenticationError();
    }
    
    // Fetch active sessions
    const sessionsResponse = await fetch(`${API_BASE_URL}/blocker/sessions`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (sessionsResponse.ok) {
      const sessionsData = await sessionsResponse.json();
      activeSessions = sessionsData.sessions;
      
      await chrome.storage.local.set({ activeSessions });
    }
    
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Update dynamic blocking rules
async function updateBlockingRules() {
  try {
    // Remove existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }
    
    // Create new rules from blocked content
    const newRules = [];
    let ruleId = 1;
    
    for (const item of blockedContent) {
      if (item.content_type === 'website' && item.is_active) {
        // Create blocking rule for website
        let urlFilter = item.content_value;
        
        // Handle different URL formats
        if (!urlFilter.includes('*')) {
          urlFilter = `*${urlFilter}*`;
        }
        
        newRules.push({
          id: ruleId++,
          priority: getBlockPriority(item.block_level),
          action: {
            type: 'redirect',
            redirect: {
              extensionPath: '/blocked.html'
            }
          },
          condition: {
            urlFilter: urlFilter,
            resourceTypes: ['main_frame']
          }
        });
      }
    }
    
    // Add new rules
    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      });
      console.log(`Updated ${newRules.length} blocking rules`);
    }
    
  } catch (error) {
    console.error('Error updating blocking rules:', error);
  }
}

// Get priority based on block level
function getBlockPriority(blockLevel) {
  switch (blockLevel) {
    case 'strict': return 3;
    case 'moderate': return 2;
    case 'lenient': return 1;
    default: return 2;
  }
}

// Handle authentication errors
async function handleAuthenticationError() {
  console.log('Authentication error - clearing token');
  isAuthenticated = false;
  userToken = null;
  
  await chrome.storage.local.remove(['userToken']);
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'RecovR Authentication Required',
    message: 'Please log in again to continue content blocking.'
  });
}

// Update extension badge
function updateBadge() {
  const activeBlocks = blockedContent.filter(item => item.is_active).length;
  const badgeText = activeBlocks > 0 ? activeBlocks.toString() : '';
  
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
}

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case 'syncBlocks':
      if (isAuthenticated) {
        await syncWithServer();
        updateBadge();
      }
      break;
      
    case 'sessionCheck':
      await checkActiveSessions();
      break;
  }
});

// Check active blocking sessions
async function checkActiveSessions() {
  const now = new Date();
  let hasActiveSession = false;
  
  for (const session of activeSessions) {
    if (session.is_active) {
      const endTime = session.end_time ? new Date(session.end_time) : null;
      
      if (!endTime || endTime > now) {
        hasActiveSession = true;
        break;
      }
    }
  }
  
  // Update icon based on session status
  const iconPath = hasActiveSession ? 'icons/icon-active' : 'icons/icon';
  chrome.action.setIcon({
    path: {
      '16': `${iconPath}16.png`,
      '32': `${iconPath}32.png`,
      '48': `${iconPath}48.png`,
      '128': `${iconPath}128.png`
    }
  });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'AUTHENTICATE':
      handleAuthentication(message.token)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'GET_STATUS':
      sendResponse({
        isAuthenticated,
        blockedCount: blockedContent.length,
        activeSessions: activeSessions.length,
        lastSync: lastSyncTime
      });
      break;
      
    case 'CHECK_URL':
      const result = checkUrlBlocked(message.url);
      sendResponse(result);
      break;
      
    case 'SYNC_NOW':
      if (isAuthenticated) {
        syncWithServer()
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
      } else {
        sendResponse({ success: false, error: 'Not authenticated' });
      }
      return true;
      
    case 'LOG_ATTEMPT':
      logBlockAttempt(message.url, message.reason)
        .catch(error => console.error('Error logging attempt:', error));
      break;
  }
});

// Handle authentication
async function handleAuthentication(token) {
  try {
    // Verify token with server
    const response = await fetch(`${API_BASE_URL}/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      userToken = token;
      isAuthenticated = true;
      
      await chrome.storage.local.set({ userToken: token });
      await syncWithServer();
      updateBadge();
      
      console.log('Authentication successful');
    } else {
      throw new Error('Invalid token');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Check if URL is blocked
function checkUrlBlocked(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const fullUrl = url.toLowerCase();
    
    for (const item of blockedContent) {
      if (!item.is_active) continue;
      
      if (item.content_type === 'website') {
        const blockedDomain = item.content_value.toLowerCase();
        if (domain.includes(blockedDomain) || fullUrl.includes(blockedDomain)) {
          return {
            isBlocked: true,
            reason: `Website blocked: ${item.content_value}`,
            blockLevel: item.block_level,
            allowBypass: item.block_level === 'lenient'
          };
        }
      } else if (item.content_type === 'keyword') {
        const keyword = item.content_value.toLowerCase();
        if (fullUrl.includes(keyword)) {
          return {
            isBlocked: true,
            reason: `Keyword blocked: ${item.content_value}`,
            blockLevel: item.block_level,
            allowBypass: item.block_level === 'lenient'
          };
        }
      }
    }
    
    return { isBlocked: false };
  } catch (error) {
    console.error('Error checking URL:', error);
    return { isBlocked: false };
  }
}

// Log block attempt to server
async function logBlockAttempt(url, reason) {
  if (!isAuthenticated || !userToken) return;
  
  try {
    await fetch(`${API_BASE_URL}/blocker/check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        keywords: extractKeywords(url)
      })
    });
  } catch (error) {
    console.error('Error logging block attempt:', error);
  }
}

// Extract keywords from URL for analysis
function extractKeywords(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    
    // Simple keyword extraction
    return path
      .split(/[\/\?\&\=\-\_\.]/)
      .filter(word => word.length > 2)
      .slice(0, 10); // Limit to 10 keywords
  } catch (error) {
    return [];
  }
}

// Handle tab updates for real-time checking
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && isAuthenticated) {
    const result = checkUrlBlocked(tab.url);
    
    if (result.isBlocked) {
      // Log the attempt
      await logBlockAttempt(tab.url, result.reason);
      
      // The declarativeNetRequest rules will handle the actual blocking
      console.log('Blocked attempt:', tab.url, result.reason);
    }
  }
});