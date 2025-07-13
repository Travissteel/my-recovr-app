import { api } from '../utils/api';

// Types for mentor program
export interface MentorEligibility {
  isEligible: boolean;
  daysUntilEligible: number;
  currentDaysClean: number;
  requiredDays: number;
  isCurrentMentor: boolean;
  mentorInfo: MentorInfo | null;
  benefits: MentorBenefits;
  requirements: MentorRequirements;
}

export interface MentorInfo {
  id: string;
  status: string;
  motivation: string;
  specialties: string[];
  availability: Record<string, any>;
  totalPoints: number;
  appliedAt: string;
  approvedAt?: string;
  subscriptionType?: string;
  expiresAt?: string;
  isLifetime?: boolean;
  statistics: MentorStatistics;
}

export interface MentorBenefits {
  premiumFeatures: boolean;
  extendedAnalytics: boolean;
  prioritySupport: boolean;
  mentorBadges: boolean;
  advancedInsights: boolean;
  communityModeration: boolean;
}

export interface MentorRequirements {
  minMentees: number;
  minMonthlyActivities: number;
  engagementActivities: string[];
}

export interface MentorStatistics {
  totalMentees: number;
  activeMentees: number;
  thisMonthActivities: number;
  totalActivities: number;
  totalPoints: number;
  thisWeekActivities: number;
}

export interface Mentee {
  id: string;
  firstName: string;
  username: string;
  profilePictureUrl?: string;
  mentorshipId: string;
  assignedAt: string;
  mentorshipStatus: string;
  currentStreak: number;
  startDate: string;
}

export interface MentorActivity {
  activityType: string;
  description: string;
  pointsEarned: number;
  createdAt: string;
  menteeName?: string;
}

export interface MentorDashboard {
  mentor: MentorInfo & {
    freeAccessStatus: FreeAccessStatus;
  };
  mentees: Mentee[];
  recentActivities: MentorActivity[];
  engagement: {
    thisMonth: number;
    required: number;
    isEligibleForFreeAccess: boolean;
  };
}

export interface FreeAccessStatus {
  isEligible: boolean;
  isLifetimeEligible: boolean;
  hasEnoughMentees: boolean;
  hasEnoughActivity: boolean;
  currentMentees: number;
  requiredMentees: number;
  currentActivity: number;
  requiredActivity: number;
  mentorDays: number;
  totalActivities: number;
}

export interface MentorApplication {
  motivation: string;
  specialties: string[];
  availability: Record<string, any>;
  mentorshipExperience: string;
}

export interface LogActivityRequest {
  activityType: string;
  description: string;
  menteeId?: string;
  metadata?: Record<string, any>;
}

class MentorService {
  // Check mentor eligibility
  async checkEligibility(): Promise<MentorEligibility> {
    const response = await api.get<MentorEligibility>('/mentor-program/eligibility');
    return response.data;
  }

  // Apply to become a mentor
  async applyToBecomeMentor(application: MentorApplication): Promise<{
    message: string;
    applicationId: string;
    status: string;
  }> {
    const response = await api.post('/mentor-program/apply', application);
    return response.data;
  }

  // Get mentor dashboard
  async getMentorDashboard(): Promise<MentorDashboard> {
    const response = await api.get<MentorDashboard>('/mentor-program/dashboard');
    return response.data;
  }

  // Log mentor activity
  async logActivity(activity: LogActivityRequest): Promise<{
    activityId: string;
    pointsEarned: number;
    message: string;
  }> {
    const response = await api.post('/mentor-program/activity', activity);
    return response.data;
  }

  // Get available mentees
  async getAvailableMentees(): Promise<{
    availableMentees: Mentee[];
  }> {
    const response = await api.get('/mentor-program/available-mentees');
    return response.data;
  }

  // Assign mentee to mentor
  async assignMentee(menteeId: string): Promise<{
    assignmentId: string;
    message: string;
    pointsEarned: number;
  }> {
    const response = await api.post('/mentor-program/assign-mentee', { menteeId });
    return response.data;
  }

  // Helper methods
  getActivityTypeLabel(activityType: string): string {
    const labels: Record<string, string> = {
      'mentee_message': 'Mentee Message',
      'group_help': 'Group Help',
      'crisis_response': 'Crisis Response',
      'challenge_support': 'Challenge Support',
      'milestone_celebration': 'Milestone Celebration',
      'community_post': 'Community Post',
      'wisdom_share': 'Wisdom Share',
      'mentee_assignment': 'Mentee Assignment'
    };
    return labels[activityType] || activityType;
  }

  getActivityTypeIcon(activityType: string): string {
    const icons: Record<string, string> = {
      'mentee_message': '💬',
      'group_help': '🤝',
      'crisis_response': '🚨',
      'challenge_support': '🎯',
      'milestone_celebration': '🎉',
      'community_post': '📝',
      'wisdom_share': '💡',
      'mentee_assignment': '👥'
    };
    return icons[activityType] || '📊';
  }

  getSubscriptionBadgeColor(subscriptionType: string): string {
    const colors: Record<string, string> = {
      'free': 'bg-gray-100 text-gray-800',
      'premium': 'bg-blue-100 text-blue-800',
      'lifetime': 'bg-purple-100 text-purple-800'
    };
    return colors[subscriptionType] || 'bg-gray-100 text-gray-800';
  }

  calculateProgressToLifetime(mentorDays: number, totalActivities: number): {
    daysProgress: number;
    activitiesProgress: number;
    overallProgress: number;
  } {
    const requiredDays = 730; // 2 years
    const requiredActivities = 240; // ~10 per month for 2 years
    
    const daysProgress = Math.min((mentorDays / requiredDays) * 100, 100);
    const activitiesProgress = Math.min((totalActivities / requiredActivities) * 100, 100);
    const overallProgress = Math.min((daysProgress + activitiesProgress) / 2, 100);
    
    return {
      daysProgress,
      activitiesProgress,
      overallProgress
    };
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  }
}

export const mentorService = new MentorService();
export default mentorService;