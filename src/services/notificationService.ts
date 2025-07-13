import { api } from '../utils/api';

// Types for notification system
export interface NotificationPreferences {
  dailyMotivation: {
    enabled: boolean;
    time: string;
    frequency: string;
    type: string;
  };
  streakReminders: {
    enabled: boolean;
    streakMilestones: number[];
    celebrateAchievements: boolean;
  };
  cravingSupport: {
    enabled: boolean;
    emergencyButton: boolean;
    quickAccess: boolean;
    immediateResponse: boolean;
  };
  checkInReminders: {
    enabled: boolean;
    time: string;
    skipWeekends: boolean;
    customMessage: boolean;
  };
  challengeNotifications: {
    enabled: boolean;
    newChallenges: boolean;
    completionReminders: boolean;
    weeklyGoals: boolean;
  };
  communityUpdates: {
    enabled: boolean;
    supportRequests: boolean;
    milestoneSharing: boolean;
    privateMentions: boolean;
  };
  healthBenefits: {
    enabled: boolean;
    timeline: boolean;
    educationalContent: boolean;
    scientificFacts: boolean;
  };
  financialUpdates: {
    enabled: boolean;
    monthlySummary: boolean;
    savingsGoals: boolean;
    milestoneAlerts: boolean;
  };
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
  availableTypes: string[];
  availableFrequencies: string[];
  customizationOptions: {
    messageTypes: Array<{ key: string; label: string }>;
    frequencies: Array<{ key: string; label: string }>;
    timingOptions: Array<{ key: string; label: string }>;
  };
}

export interface NotificationHistory {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    notification_type: string;
    is_read: boolean;
    action_url?: string;
    created_at: string;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  unreadCount: number;
}

export interface SuggestedSchedule {
  name: string;
  description: string;
  times: string[];
  frequency: string;
  type: string;
}

export interface SuggestedSchedulesResponse {
  schedules: SuggestedSchedule[];
  personalizationTips: string[];
  optimalTimes: {
    morning: {
      time: string;
      purpose: string;
      effectiveness: string;
    };
    midday: {
      time: string;
      purpose: string;
      effectiveness: string;
    };
    evening: {
      time: string;
      purpose: string;
      effectiveness: string;
    };
    avoid: {
      times: string[];
      reason: string;
    };
  };
}

export interface MotivationalContent {
  content: Array<{
    content_type: string;
    title?: string;
    content: string;
    author?: string;
    category: string;
  }>;
  personalizedNotifications: Array<{
    title: string;
    message: string;
    category: string;
    type: string;
  }>;
  categories: string[];
  types: string[];
}

export interface CreateTemplateRequest {
  name: string;
  title: string;
  message: string;
  triggers?: string[];
  schedule?: Record<string, any>;
}

export interface TestNotificationRequest {
  type?: string;
  message?: string;
}

class NotificationService {
  // Get user's notification preferences
  async getPreferences(): Promise<NotificationPreferencesResponse> {
    const response = await api.get<NotificationPreferencesResponse>('/notification-system/preferences');
    return response.data;
  }

  // Update notification preferences
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    await api.put('/notification-system/preferences', { preferences });
  }

  // Get notification history
  async getNotificationHistory(
    limit: number = 50,
    offset: number = 0,
    type?: string
  ): Promise<NotificationHistory> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (type) {
      params.append('type', type);
    }

    const response = await api.get<NotificationHistory>(
      `/notification-system/history?${params.toString()}`
    );
    return response.data;
  }

  // Mark notifications as read
  async markNotificationsRead(notificationIds?: string[]): Promise<void> {
    const payload = notificationIds 
      ? { notificationIds } 
      : { markAll: true };
    
    await api.put('/notification-system/mark-read', payload);
  }

  // Send test notification
  async sendTestNotification(data: TestNotificationRequest): Promise<void> {
    await api.post('/notification-system/test', data);
  }

  // Get suggested notification schedules
  async getSuggestedSchedules(): Promise<SuggestedSchedulesResponse> {
    const response = await api.get<SuggestedSchedulesResponse>('/notification-system/suggested-schedules');
    return response.data;
  }

  // Create custom notification template
  async createTemplate(data: CreateTemplateRequest): Promise<void> {
    await api.post('/notification-system/templates', data);
  }

  // Get motivational content for notifications
  async getMotivationalContent(
    category: string = 'all',
    type: string = 'all'
  ): Promise<MotivationalContent> {
    const response = await api.get<MotivationalContent>(
      `/notification-system/motivational-content?category=${category}&type=${type}`
    );
    return response.data;
  }

  // Helper method to format notification time
  formatNotificationTime(time: string): string {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  }

  // Helper method to get notification type icon
  getNotificationTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      milestone: '🏆',
      reminder: '⏰',
      community: '👥',
      crisis: '🆘',
      system: '⚙️',
      motivation: '💪',
      achievement: '🎉',
      health: '🏥',
      financial: '💰'
    };
    return icons[type] || '📢';
  }

  // Helper method to get notification priority color
  getNotificationPriorityColor(type: string): string {
    const colors: Record<string, string> = {
      crisis: 'text-red-600 dark:text-red-400',
      milestone: 'text-yellow-600 dark:text-yellow-400',
      achievement: 'text-purple-600 dark:text-purple-400',
      reminder: 'text-blue-600 dark:text-blue-400',
      community: 'text-green-600 dark:text-green-400',
      system: 'text-gray-600 dark:text-gray-400'
    };
    return colors[type] || 'text-gray-600 dark:text-gray-400';
  }

  // Helper method to validate notification time
  validateTime(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // Helper method to calculate optimal notification times based on user activity
  calculateOptimalTimes(userActivity: Array<{ hour: number; activity: number }>): string[] {
    const sortedActivity = userActivity
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 3);

    return sortedActivity.map(activity => 
      `${activity.hour.toString().padStart(2, '0')}:00`
    );
  }

  // Helper method to generate personalized notification message
  generatePersonalizedMessage(
    template: string,
    userContext: {
      firstName?: string;
      currentStreak?: number;
      totalDays?: number;
      addictionType?: string;
    }
  ): string {
    let message = template;

    if (userContext.firstName) {
      message = message.replace('{firstName}', userContext.firstName);
    }
    if (userContext.currentStreak) {
      message = message.replace('{currentStreak}', userContext.currentStreak.toString());
    }
    if (userContext.totalDays) {
      message = message.replace('{totalDays}', userContext.totalDays.toString());
    }
    if (userContext.addictionType) {
      message = message.replace('{addictionType}', userContext.addictionType);
    }

    return message;
  }

  // Helper method to get frequency label
  getFrequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      'multiple_daily': 'Multiple times per day',
      'daily': 'Once daily',
      'every_other_day': 'Every other day',
      'weekly': 'Weekly',
      'milestone_only': 'Milestones only',
      'as_needed': 'As needed'
    };
    return labels[frequency] || frequency;
  }

  // Helper method to get message type description
  getMessageTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'encouraging': 'Positive, supportive messages that uplift and motivate',
      'scientific': 'Evidence-based facts about recovery and health benefits',
      'spiritual': 'Reflective messages focused on inner growth and peace',
      'practical': 'Action-oriented tips and concrete steps for recovery',
      'humorous': 'Light-hearted messages to bring positivity to your day'
    };
    return descriptions[type] || type;
  }
}

export const notificationService = new NotificationService();
export default notificationService;