// RecovR Content Blocker - Content Script
// Runs on all web pages to analyze content and enforce blocking

// Configuration
let isActive = false;
let blockedKeywords = [];
let userSettings = {};

// Initialize content script
(function() {
  console.log('RecovR Content Blocker - Content script loaded');
  
  // Get status from background script
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response && response.isAuthenticated) {
      isActive = true;
      initializeContentAnalysis();
    }
  });
  
  // Check current page URL
  checkCurrentPage();
})();

// Initialize content analysis
function initializeContentAnalysis() {
  if (!isActive) return;
  
  // Analyze page content for keywords
  analyzePageContent();
  
  // Set up mutation observer for dynamic content
  setupContentObserver();
  
  // Monitor form submissions that might contain triggers
  monitorFormSubmissions();
}

// Check if current page should be blocked
function checkCurrentPage() {
  const currentUrl = window.location.href;
  
  chrome.runtime.sendMessage({ 
    type: 'CHECK_URL', 
    url: currentUrl 
  }, (response) => {
    if (response && response.isBlocked) {
      // Page is blocked - this shouldn't happen due to declarativeNetRequest
      // But we can add additional client-side protection
      console.log('Page blocked by RecovR:', response.reason);
      
      if (response.allowBypass && response.blockLevel === 'lenient') {
        showBypassOption(response);
      }
    }
  });
}

// Analyze page content for blocked keywords
function analyzePageContent() {
  const textContent = document.body.textContent || '';
  const pageTitle = document.title || '';
  const metaDescription = getMetaDescription();
  
  const allText = `${pageTitle} ${metaDescription} ${textContent}`.toLowerCase();
  
  // Check against blocked keywords (this would be populated from background script)
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response && response.isAuthenticated) {
      // We could implement real-time keyword scanning here
      // For now, we rely on the background script's URL blocking
    }
  });
}

// Set up mutation observer for dynamic content
function setupContentObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldReanalyze = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if added content contains text
            if (node.textContent && node.textContent.trim().length > 10) {
              shouldReanalyze = true;
            }
          }
        });
      }
    });
    
    if (shouldReanalyze) {
      // Debounce content analysis
      clearTimeout(window.recovrAnalysisTimeout);
      window.recovrAnalysisTimeout = setTimeout(() => {
        analyzeNewContent();
      }, 1000);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Analyze newly added content
function analyzeNewContent() {
  // This could implement real-time content analysis
  // For performance, we focus on URL-based blocking in the background script
  console.log('RecovR: Analyzing new content...');
}

// Monitor form submissions for trigger content
function monitorFormSubmissions() {
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.tagName === 'FORM') {
      const formData = new FormData(form);
      let hasSearchTerms = false;
      
      // Check form data for search terms or comments
      for (let [key, value] of formData.entries()) {
        if (typeof value === 'string' && value.length > 3) {
          // Check if this might be a search or comment field
          const fieldName = key.toLowerCase();
          if (fieldName.includes('search') || 
              fieldName.includes('query') || 
              fieldName.includes('comment') ||
              fieldName.includes('message')) {
            hasSearchTerms = true;
            break;
          }
        }
      }
      
      if (hasSearchTerms) {
        // Log potential trigger search
        chrome.runtime.sendMessage({
          type: 'LOG_ATTEMPT',
          url: window.location.href,
          reason: 'Form submission with search terms'
        });
      }
    }
  });
}

// Get meta description
function getMetaDescription() {
  const metaDescription = document.querySelector('meta[name="description"]');
  return metaDescription ? metaDescription.getAttribute('content') || '' : '';
}

// Show bypass option for lenient blocks
function showBypassOption(blockInfo) {
  const bypassOverlay = document.createElement('div');
  bypassOverlay.id = 'recovr-bypass-overlay';
  bypassOverlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      ">
        <div style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
        <h2 style="color: #1f2937; margin: 0 0 1rem 0; font-size: 1.25rem;">Content Warning</h2>
        <p style="color: #6b7280; margin: 0 0 1.5rem 0; line-height: 1.5;">
          ${blockInfo.reason}
        </p>
        <p style="color: #6b7280; margin: 0 0 1.5rem 0; font-size: 0.875rem;">
          This content may not support your recovery goals. Are you sure you want to continue?
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button id="recovr-bypass-cancel" style="
            background: #ef4444;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
          ">Go Back</button>
          <button id="recovr-bypass-continue" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
          ">Continue Anyway</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(bypassOverlay);
  
  // Handle bypass actions
  document.getElementById('recovr-bypass-cancel').addEventListener('click', () => {
    window.history.back();
  });
  
  document.getElementById('recovr-bypass-continue').addEventListener('click', () => {
    // Log bypass
    chrome.runtime.sendMessage({
      type: 'LOG_ATTEMPT',
      url: window.location.href,
      reason: `Bypassed ${blockInfo.blockLevel} block: ${blockInfo.reason}`
    });
    
    bypassOverlay.remove();
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'UPDATE_STATUS':
      isActive = message.isAuthenticated;
      if (isActive && !window.recovrInitialized) {
        window.recovrInitialized = true;
        initializeContentAnalysis();
      }
      break;
      
    case 'FORCE_REDIRECT':
      // Emergency redirect from background script
      window.location.href = chrome.runtime.getURL('blocked.html');
      break;
  }
});

// Prevent common bypass attempts
(function() {
  // Disable some developer tools shortcuts in strict mode
  // This is just a minor deterrent, not security
  
  // Override console methods to detect bypass attempts
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    
    // Check for bypass attempts in console
    const logString = args.join(' ').toLowerCase();
    if (logString.includes('recovr') && logString.includes('bypass')) {
      chrome.runtime.sendMessage({
        type: 'LOG_ATTEMPT',
        url: window.location.href,
        reason: 'Console bypass attempt detected'
      });
    }
  };
})();

// Add some CSS to improve blocked page appearance
const style = document.createElement('style');
style.textContent = `
  .recovr-hidden {
    display: none !important;
  }
  
  .recovr-blur {
    filter: blur(10px) !important;
    pointer-events: none !important;
  }
  
  .recovr-warning {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 0.875rem;
    z-index: 9999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
`;
document.head.appendChild(style);