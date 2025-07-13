// RecovR Content Blocker - Popup Interface

// State management
let currentState = 'loading';
let extensionStatus = null;

// DOM elements
const loadingState = document.getElementById('loading-state');
const authRequired = document.getElementById('auth-required');
const mainInterface = document.getElementById('main-interface');
const emergencyHelp = document.getElementById('emergency-help');

// Status elements
const statusIndicator = document.getElementById('status-indicator');
const blockedCount = document.getElementById('blocked-count');
const sessionsCount = document.getElementById('sessions-count');
const lastSync = document.getElementById('last-sync');

// Buttons
const signInBtn = document.getElementById('sign-in-btn');
const createAccountBtn = document.getElementById('create-account-btn');
const syncNowBtn = document.getElementById('sync-now-btn');
const manageBlocksBtn = document.getElementById('manage-blocks-btn');
const viewStatsBtn = document.getElementById('view-stats-btn');
const emergencyBtn = document.getElementById('emergency-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const backToMainBtn = document.getElementById('back-to-main-btn');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('RecovR Popup initialized');
  await loadExtensionStatus();
  setupEventListeners();
});

// Load extension status from background script
async function loadExtensionStatus() {
  try {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting status:', chrome.runtime.lastError);
        showError();
        return;
      }
      
      extensionStatus = response;
      updateUI();
    });
  } catch (error) {
    console.error('Error loading status:', error);
    showError();
  }
}

// Update UI based on current status
function updateUI() {
  if (!extensionStatus) {
    showState('loading');
    return;
  }
  
  if (!extensionStatus.isAuthenticated) {
    showState('auth-required');
    return;
  }
  
  showState('main');
  updateStatusInfo();
}

// Show specific state
function showState(state) {
  // Hide all states
  loadingState.classList.add('hidden');
  authRequired.classList.add('hidden');
  mainInterface.classList.add('hidden');
  emergencyHelp.classList.add('hidden');
  
  // Show target state
  switch (state) {
    case 'loading':
      loadingState.classList.remove('hidden');
      break;
    case 'auth-required':
      authRequired.classList.remove('hidden');
      break;
    case 'main':
      mainInterface.classList.remove('hidden');
      break;
    case 'emergency':
      emergencyHelp.classList.remove('hidden');
      break;
  }
  
  currentState = state;
}

// Update status information in main interface
function updateStatusInfo() {
  if (!extensionStatus) return;
  
  // Update status indicator
  if (extensionStatus.isAuthenticated && extensionStatus.blockedCount > 0) {
    statusIndicator.classList.remove('inactive');
  } else {
    statusIndicator.classList.add('inactive');
  }
  
  // Update stats
  blockedCount.textContent = extensionStatus.blockedCount || 0;
  sessionsCount.textContent = extensionStatus.activeSessions || 0;
  
  // Update last sync time
  if (extensionStatus.lastSync && extensionStatus.lastSync > 0) {
    const syncTime = new Date(extensionStatus.lastSync);
    const now = new Date();
    const diffMinutes = Math.floor((now - syncTime) / (1000 * 60));
    
    if (diffMinutes < 1) {
      lastSync.textContent = 'Just now';
    } else if (diffMinutes < 60) {
      lastSync.textContent = `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      lastSync.textContent = `${diffHours}h ago`;
    }
  } else {
    lastSync.textContent = 'Never';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Authentication buttons
  signInBtn.addEventListener('click', handleSignIn);
  createAccountBtn.addEventListener('click', handleCreateAccount);
  
  // Main interface buttons
  syncNowBtn.addEventListener('click', handleSyncNow);
  manageBlocksBtn.addEventListener('click', handleManageBlocks);
  viewStatsBtn.addEventListener('click', handleViewStats);
  emergencyBtn.addEventListener('click', handleEmergency);
  signOutBtn.addEventListener('click', handleSignOut);
  
  // Emergency help
  backToMainBtn.addEventListener('click', () => showState('main'));
}

// Handle sign in
function handleSignIn() {
  chrome.tabs.create({
    url: 'http://localhost:3000/login?extension=true'
  });
  
  // Listen for authentication completion
  chrome.tabs.onUpdated.addListener(function authListener(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('localhost:3000/dashboard')) {
      
      // User successfully logged in
      chrome.tabs.remove(tabId);
      chrome.tabs.onUpdated.removeListener(authListener);
      
      // Refresh status
      setTimeout(() => {
        loadExtensionStatus();
      }, 1000);
    }
  });
}

// Handle create account
function handleCreateAccount() {
  chrome.tabs.create({
    url: 'http://localhost:3000/register?extension=true'
  });
}

// Handle sync now
async function handleSyncNow() {
  syncNowBtn.disabled = true;
  syncNowBtn.innerHTML = '<span class="action-text">Syncing...</span><span class="action-icon">⏳</span>';
  
  chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, (response) => {
    syncNowBtn.disabled = false;
    syncNowBtn.innerHTML = '<span class="action-text">Sync Now</span><span class="action-icon">🔄</span>';
    
    if (response && response.success) {
      // Refresh status after sync
      setTimeout(() => {
        loadExtensionStatus();
      }, 500);
    } else {
      alert('Sync failed. Please try again.');
    }
  });
}

// Handle manage blocks
function handleManageBlocks() {
  chrome.tabs.create({
    url: 'http://localhost:3000/blocker'
  });
}

// Handle view stats
function handleViewStats() {
  chrome.tabs.create({
    url: 'http://localhost:3000/blocker?tab=analytics'
  });
}

// Handle emergency
function handleEmergency() {
  showState('emergency');
}

// Handle sign out
function handleSignOut() {
  if (confirm('Are you sure you want to sign out? Content blocking will be disabled.')) {
    chrome.storage.local.remove(['userToken'], () => {
      // Force background script to update
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, () => {
        loadExtensionStatus();
      });
    });
  }
}

// Show error state
function showError() {
  loadingState.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <div style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
      <div style="color: white; margin-bottom: 1rem;">Unable to connect to RecovR</div>
      <button onclick="location.reload()" class="btn btn-secondary" style="width: auto; padding: 0.5rem 1rem;">
        Retry
      </button>
    </div>
  `;
}

// Handle extension updates/reloads
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATUS_UPDATED') {
    loadExtensionStatus();
  }
});

// Refresh status periodically while popup is open
setInterval(() => {
  if (currentState === 'main') {
    loadExtensionStatus();
  }
}, 30000); // Every 30 seconds