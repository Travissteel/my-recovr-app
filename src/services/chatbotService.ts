import { api } from '../utils/api';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'crisis';
  isTyping?: boolean;
  crisisDetected?: boolean;
}

export interface ChatConversation {
  id: string;
  conversationId: string;
  title?: string;
  lastMessageAt: string;
  messageCount: number;
  status: 'active' | 'archived' | 'deleted';
}

export interface ChatbotStatus {
  enabled: boolean;
  status: 'active' | 'development';
  features: {
    basicChat: boolean;
    crisisDetection: boolean;
    sentimentAnalysis: boolean;
    personalizedResponses: boolean;
    voiceChat: boolean;
    multiLanguage: boolean;
  };
  expectedLaunch?: string;
  model: string;
  lastUpdated: string;
}

export interface SendMessageResponse {
  response: string;
  sentiment: string;
  conversationId: string;
  timestamp: string;
  crisisDetected?: boolean;
  resources?: {
    crisis?: string;
    emergency?: string;
    suicide_prevention?: string;
  };
}

class ChatbotService {
  private static instance: ChatbotService;
  private isEnabled: boolean = false;
  private status: ChatbotStatus | null = null;

  private constructor() {}

  static getInstance(): ChatbotService {
    if (!ChatbotService.instance) {
      ChatbotService.instance = new ChatbotService();
    }
    return ChatbotService.instance;
  }

  // Get chatbot status and configuration
  async getStatus(): Promise<ChatbotStatus> {
    try {
      const response = await api.get('/chatbot/status');
      this.status = response.data;
      this.isEnabled = response.data.enabled;
      return response.data;
    } catch (error) {
      console.error('Failed to get chatbot status:', error);
      // Return default status for development
      const defaultStatus: ChatbotStatus = {
        enabled: false,
        status: 'development',
        features: {
          basicChat: false,
          crisisDetection: false,
          sentimentAnalysis: false,
          personalizedResponses: false,
          voiceChat: false,
          multiLanguage: false
        },
        expectedLaunch: '3-6 months after platform release',
        model: 'RecovR-AI-v1.0',
        lastUpdated: new Date().toISOString()
      };
      this.status = defaultStatus;
      return defaultStatus;
    }
  }

  // Send message to AI chatbot
  async sendMessage(
    message: string, 
    conversationId?: string
  ): Promise<SendMessageResponse> {
    try {
      const response = await api.post('/chatbot/message', {
        message: message.trim(),
        conversationId
      });

      return response.data;
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 503) {
        throw new Error('AI Chatbot is currently under development. This feature will be available in a future update.');
      } else if (error.response?.status === 429) {
        throw new Error('Too many messages sent. Please slow down.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Invalid message format.');
      }

      console.error('Failed to send message to chatbot:', error);
      throw new Error('Failed to send message. Please try again later.');
    }
  }

  // Get chat history
  async getChatHistory(limit: number = 50, offset: number = 0): Promise<ChatConversation[]> {
    try {
      const response = await api.get('/chatbot/history', {
        params: { limit, offset }
      });

      return response.data.conversations || [];
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return []; // Return empty array for development
    }
  }

  // Delete conversation
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await api.delete(`/chatbot/conversation/${conversationId}`);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw new Error('Failed to delete conversation.');
    }
  }

  // Check if chatbot is enabled
  isFeatureEnabled(): boolean {
    return this.isEnabled;
  }

  // Get current status without API call
  getCurrentStatus(): ChatbotStatus | null {
    return this.status;
  }

  // Simulate AI response for development/demo
  simulateAIResponse(userMessage: string): Promise<SendMessageResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = [
          "I understand you're looking for support. While I'm currently being developed, I'll soon be able to provide personalized recovery guidance.",
          "Thank you for sharing that with me. Recovery is a journey, and every step forward matters, no matter how small.",
          "I hear you, and your feelings are valid. Would you like to try a quick breathing exercise or talk about what's on your mind?",
          "That's a great question about recovery. While I'm still learning, I can direct you to our Crisis Support if you need immediate help.",
          "Your progress is inspiring. Remember, setbacks are part of the process, not failures. How can I support you today?",
          "I appreciate you reaching out. Recovery takes courage, and you're showing that by being here. What's been on your mind lately?",
          "Every day in recovery is a victory worth celebrating. How are you feeling about your journey today?",
          "It's normal to have ups and downs in recovery. What matters is that you keep moving forward. What's helping you stay motivated?"
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Simple crisis detection for demo
        const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'hopeless', 'cant take it'];
        const isCrisis = crisisKeywords.some(keyword => 
          userMessage.toLowerCase().includes(keyword)
        );

        if (isCrisis) {
          resolve({
            response: "I notice you might be going through a really difficult time. Your safety is important to me. Please reach out to our Crisis Support immediately or contact emergency services if you're in immediate danger.",
            sentiment: 'crisis',
            conversationId: `demo_conv_${Date.now()}`,
            timestamp: new Date().toISOString(),
            crisisDetected: true,
            resources: {
              crisis: '/crisis',
              emergency: '911',
              suicide_prevention: '988'
            }
          });
        } else {
          resolve({
            response: randomResponse,
            sentiment: 'neutral',
            conversationId: `demo_conv_${Date.now()}`,
            timestamp: new Date().toISOString()
          });
        }
      }, 1000 + Math.random() * 2000); // Simulate 1-3 second response time
    });
  }

  // Analyze message sentiment (client-side basic implementation for demo)
  analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' | 'crisis' {
    const positiveWords = ['good', 'great', 'happy', 'better', 'progress', 'proud', 'success', 'hope'];
    const negativeWords = ['bad', 'terrible', 'sad', 'worse', 'failed', 'struggling', 'difficult'];
    const crisisWords = ['suicide', 'kill myself', 'end it all', 'hopeless', 'cant take it', 'want to die'];

    const lowerMessage = message.toLowerCase();
    
    if (crisisWords.some(word => lowerMessage.includes(word))) {
      return 'crisis';
    }

    const positiveCount = positiveWords.reduce((count, word) => 
      count + (lowerMessage.includes(word) ? 1 : 0), 0);
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (lowerMessage.includes(word) ? 1 : 0), 0);

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Validate message before sending
  validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 1000) {
      return { valid: false, error: 'Message must be less than 1000 characters' };
    }

    // Check for inappropriate content
    const inappropriatePatterns = [
      /\b(spam|scam|advertisement)\b/i,
      /\b(sell|buy|promotion)\b/i,
      /http[s]?:\/\/(?!recovr\.com)/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(message)) {
        return { valid: false, error: 'Message contains inappropriate content' };
      }
    }

    return { valid: true };
  }
}

export const chatbotService = ChatbotService.getInstance();