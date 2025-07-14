// AI Chatbot Configuration
require('dotenv').config();

const chatbotConfig = {
  // Feature flags
  enabled: process.env.AI_CHATBOT_ENABLED === 'true' || false,
  
  // AI Provider Configuration
  provider: process.env.AI_PROVIDER || 'openai', // 'openai', 'anthropic', 'custom'
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1'
  },

  // Anthropic (Claude) Configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 1000,
    temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE) || 0.7,
    apiUrl: process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1'
  },

  // Custom AI Configuration (for local models, etc.)
  custom: {
    apiUrl: process.env.CUSTOM_AI_API_URL,
    apiKey: process.env.CUSTOM_AI_API_KEY,
    model: process.env.CUSTOM_AI_MODEL || 'recovr-ai-v1',
    maxTokens: parseInt(process.env.CUSTOM_AI_MAX_TOKENS) || 1000,
    temperature: parseFloat(process.env.CUSTOM_AI_TEMPERATURE) || 0.7
  },

  // System prompts and guidelines
  systemPrompts: {
    default: `You are a compassionate AI recovery companion for RecovR, a multi-addiction recovery platform. Your role is to provide supportive, evidence-based guidance to individuals in recovery from various addictions including pornography, social media, alcohol, drugs, food, and behavioral addictions.

Guidelines:
- Always be empathetic, non-judgmental, and encouraging
- Use evidence-based recovery principles (CBT, DBT, motivational interviewing)
- Recognize crisis situations and escalate appropriately
- Encourage professional help when needed
- Maintain hope and focus on progress, not perfection
- Respect user privacy and confidentiality
- Avoid giving medical advice
- Celebrate small wins and milestones
- Keep responses concise but meaningful (under 200 words typically)

Crisis Detection:
If you detect any crisis indicators (suicide ideation, self-harm, overdose risk), immediately:
1. Express empathy and concern
2. Provide crisis resources
3. Encourage immediate professional help
4. Flag the conversation for human review

Recovery Focus Areas:
- Addiction recovery strategies
- Coping mechanisms and healthy habits
- Emotional support and validation
- Motivation and goal setting
- Relapse prevention
- Community and support system building`,

    crisis: `CRISIS MODE ACTIVATED. The user may be in immediate danger. Your response should:
1. Acknowledge their pain with empathy
2. Emphasize that their life has value
3. Provide immediate crisis resources
4. Encourage contacting emergency services if needed
5. Suggest safer coping strategies if appropriate
6. Be directive about seeking immediate help

Remember: You are not a replacement for professional crisis intervention.`
  },

  // Crisis detection settings
  crisisDetection: {
    enabled: true,
    keywords: [
      'suicide', 'kill myself', 'end it all', 'self harm', 'hurt myself',
      'want to die', 'no point living', 'hopeless', 'overdose', 
      'cant take it anymore', 'better off dead', 'worthless',
      'cut myself', 'pills', 'bridge', 'rope', 'gun'
    ],
    phrases: [
      'thinking about suicide',
      'planning to kill myself',
      'ready to end it',
      'cannot go on',
      'too much pain',
      'want to disappear',
      'everyone would be better without me'
    ],
    escalationThreshold: 0.7, // Confidence threshold for crisis detection
    humanReviewRequired: true
  },

  // Conversation limits and controls
  limits: {
    maxConversationLength: 50, // Max messages per conversation
    maxDailyMessages: 200, // Max messages per user per day
    maxMessageLength: 1000, // Max characters per message
    responseTimeout: 30000, // 30 seconds
    rateLimitWindow: 60000, // 1 minute
    rateLimitMax: 20 // 20 messages per minute
  },

  // Content filtering
  contentFilter: {
    enabled: true,
    blockedPatterns: [
      /\b(spam|scam|advertisement)\b/i,
      /\b(sell|buy|promotion)\b/i,
      /http[s]?:\/\/(?!recovr\.com)/i, // Block external links except our domain
      /\b(sexual|explicit|adult)\b/i // Block inappropriate content
    ],
    allowedDomains: ['recovr.com', 'crisis.org', 'suicidepreventionlifeline.org']
  },

  // Response customization
  responses: {
    welcomeMessage: "Hi there! 👋 I'm your AI recovery companion. I'm here to provide support, answer questions about your recovery journey, and help you stay motivated. How can I help you today?",
    
    unavailableMessage: "I'm currently under development and not yet available for full conversations. However, I'll be launching soon with 24/7 support capabilities! In the meantime, please check out our Crisis Support section if you need immediate help.",
    
    errorMessage: "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment, or reach out to our community support if you need immediate assistance.",
    
    crisisMessage: "I notice you might be going through a really difficult time. Your safety is important to me. Please reach out to our Crisis Support immediately or contact emergency services if you're in immediate danger.",
    
    dailyLimitMessage: "You've reached your daily message limit. This helps ensure everyone has access to support. The limit will reset tomorrow, or you can explore our community features for additional support.",
    
    rateLimitMessage: "Please slow down a bit. I want to give thoughtful responses to your messages. Try sending your next message in a moment."
  },

  // Analytics and monitoring
  analytics: {
    enabled: true,
    trackSentiment: true,
    trackTopics: true,
    trackResponseTimes: true,
    trackUserSatisfaction: true,
    retentionPeriod: 90 // days to keep analytics data
  },

  // Database settings
  database: {
    connectionPoolSize: 10,
    queryTimeout: 5000, // 5 seconds
    retryAttempts: 3,
    enableLogging: process.env.NODE_ENV !== 'production'
  },

  // Security settings
  security: {
    encryptMessages: true,
    encryptionKey: process.env.CHAT_ENCRYPTION_KEY,
    auditLogging: true,
    ipWhitelist: [], // Empty array allows all IPs
    requireAuth: true,
    sessionTimeout: 3600000 // 1 hour
  },

  // Feature toggles for gradual rollout
  features: {
    basicChat: false, // Enable basic Q&A
    personalizedResponses: false, // Enable user context in responses
    crisisIntervention: false, // Enable crisis detection and response
    voiceChat: false, // Enable voice-to-text and text-to-voice
    multiLanguage: false, // Enable multiple language support
    fileUpload: false, // Enable file sharing (images, documents)
    groupChat: false, // Enable group conversations
    scheduledCheckIns: false, // Enable proactive check-ins
    integrationTherapists: false // Enable therapist integration
  },

  // Development and testing
  development: {
    mockResponses: true, // Use mock responses when AI not available
    debugLogging: process.env.NODE_ENV === 'development',
    testMode: process.env.NODE_ENV === 'test',
    bypassRateLimit: process.env.NODE_ENV === 'development'
  }
};

// Validation function
const validateConfig = () => {
  const errors = [];

  if (chatbotConfig.enabled) {
    // Check AI provider configuration
    switch (chatbotConfig.provider) {
      case 'openai':
        if (!chatbotConfig.openai.apiKey) {
          errors.push('OpenAI API key is required when using OpenAI provider');
        }
        break;
      case 'anthropic':
        if (!chatbotConfig.anthropic.apiKey) {
          errors.push('Anthropic API key is required when using Anthropic provider');
        }
        break;
      case 'custom':
        if (!chatbotConfig.custom.apiUrl) {
          errors.push('Custom API URL is required when using custom provider');
        }
        break;
      default:
        errors.push(`Invalid AI provider: ${chatbotConfig.provider}`);
    }

    // Check encryption key for security
    if (chatbotConfig.security.encryptMessages && !chatbotConfig.security.encryptionKey) {
      errors.push('Encryption key is required when message encryption is enabled');
    }
  }

  if (errors.length > 0) {
    console.error('Chatbot configuration errors:', errors);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid chatbot configuration');
    }
  }

  return errors.length === 0;
};

// Initialize configuration
const initializeConfig = () => {
  try {
    validateConfig();
    console.log(`Chatbot configuration loaded. Enabled: ${chatbotConfig.enabled}`);
    if (chatbotConfig.enabled) {
      console.log(`AI Provider: ${chatbotConfig.provider}`);
      console.log(`Features enabled: ${Object.entries(chatbotConfig.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature)
        .join(', ') || 'none'}`);
    }
  } catch (error) {
    console.error('Failed to initialize chatbot configuration:', error);
    // Disable chatbot if configuration is invalid
    chatbotConfig.enabled = false;
  }
};

// Export configuration and utilities
module.exports = {
  chatbotConfig,
  validateConfig,
  initializeConfig,
  
  // Helper functions
  isEnabled: () => chatbotConfig.enabled,
  getProvider: () => chatbotConfig.provider,
  getSystemPrompt: (type = 'default') => chatbotConfig.systemPrompts[type] || chatbotConfig.systemPrompts.default,
  getCrisisKeywords: () => [...chatbotConfig.crisisDetection.keywords, ...chatbotConfig.crisisDetection.phrases],
  isFeatureEnabled: (feature) => chatbotConfig.features[feature] || false
};

// Initialize on module load
initializeConfig();