import { api } from '../utils/api';

// Types for gamification features
export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
  phase?: string;
  daysRequired?: number;
  earnedAt?: string;
  pointsAwarded?: number;
}

export interface ProgressData {
  programs: Array<{
    id: string;
    addictionType: string;
    color: string;
    currentStreak: number;
    longestStreak: number;
    daysSinceStart: number;
    startDate: string;
    status: string;
  }>;
  overallStats: {
    totalDaysClean: number;
    longestStreak: number;
    totalPrograms: number;
    checkInStreak: number;
  };
  recentCheckIns: Array<{
    checkin_date: string;
    mood_rating: number;
    energy_level: number;
    craving_intensity: number;
  }>;
  achievements: Achievement[];
}

export interface HealthBenefit {
  timeframe: string;
  title: string;
  benefits: string[];
  icon: string;
  category: string;
  requiredDays?: number;
  daysUntilUnlock?: number;
  unlockDate?: string;
  unlockedAt?: string;
}

export interface HealthBenefitsResponse {
  program: {
    addictionType: string;
    startDate: string;
    currentStreak: number;
    daysSinceStart: number;
  };
  unlockedBenefits: HealthBenefit[];
  upcomingBenefits: HealthBenefit[];
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  firstName: string;
  profilePictureUrl?: string;
  totalPoints?: number;
  achievementCount?: number;
  longestCurrentStreak?: number;
  longestEverStreak?: number;
  rank: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  timeframe: string;
  type: string;
}

export interface CheckAchievementsRequest {
  actionType: string;
  metadata?: Record<string, any>;
}

export interface CheckAchievementsResponse {
  newAchievements: Achievement[];
  totalNewPoints: number;
}

// Extended 365-day program types
export interface RecoveryPhase {
  name: string;
  description: string;
  duration: number | null;
  color: string;
  icon: string;
  focus: string[];
  challenges: string[];
  progress?: number;
  daysCompleted?: number;
  daysRemaining?: number;
}

export interface ExtendedProgressData {
  currentPhase: RecoveryPhase & {
    name: string;
    progress: number;
    daysCompleted: number;
    daysRemaining: number;
  };
  nextPhase: RecoveryPhase | null;
  yearlyProgress: {
    percentage: number;
    daysCompleted: number;
    daysRemaining: number;
    isComplete: boolean;
  };
  nextMilestone: Achievement & {
    key: string;
    daysUntil: number;
  } | null;
  programs: Array<{
    id: string;
    addictionType: string;
    color: string;
    currentStreak: number;
    longestStreak: number;
    daysSinceStart: number;
    startDate: string;
    phase: string;
  }>;
  achievements: {
    earned: Achievement[];
    available: Achievement[];
    totalPoints: number;
  };
  phaseStatistics: {
    phasesCompleted: number;
    currentPhaseDay: number;
    overallProgress: number;
  };
  motivationalMessage: string;
}

class GamificationService {
  // Get user's progress data
  async getProgress(): Promise<ProgressData> {
    const response = await api.get<ProgressData>('/gamification/progress');
    return response.data;
  }

  // Get health benefits timeline
  async getHealthBenefits(programId: string): Promise<HealthBenefitsResponse> {
    const response = await api.get<HealthBenefitsResponse>(
      `/gamification/health-benefits?programId=${programId}`
    );
    return response.data;
  }

  // Check and award achievements
  async checkAchievements(data: CheckAchievementsRequest): Promise<CheckAchievementsResponse> {
    const response = await api.post<CheckAchievementsResponse>(
      '/gamification/check-achievements',
      data
    );
    return response.data;
  }

  // Get leaderboard
  async getLeaderboard(
    timeframe: string = 'all_time',
    type: string = 'points'
  ): Promise<LeaderboardResponse> {
    const response = await api.get<LeaderboardResponse>(
      `/gamification/leaderboard?timeframe=${timeframe}&type=${type}`
    );
    return response.data;
  }

  // Get extended 365-day progress
  async getExtendedProgress(): Promise<ExtendedProgressData> {
    const response = await api.get<ExtendedProgressData>('/extended-gamification/extended-progress');
    return response.data;
  }

  // Get detailed phase information
  async getPhaseInfo(phaseName: string): Promise<{
    phase: RecoveryPhase;
    achievements: Achievement[];
    challenges: any[];
    userProgress: any;
    tips: string[];
    focusAreas: string[];
    estimatedDuration: number | null;
    nextPhase: string | null;
  }> {
    const response = await api.get(`/extended-gamification/phases/${phaseName}`);
    return response.data;
  }

  // Helper method to calculate level from experience points
  calculateLevel(experiencePoints: number): { level: number; nextLevelXP: number; progress: number } {
    // Simple level calculation - could be made more complex
    const level = Math.floor(experiencePoints / 100) + 1;
    const currentLevelXP = (level - 1) * 100;
    const nextLevelXP = level * 100;
    const progress = ((experiencePoints - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    return {
      level,
      nextLevelXP,
      progress: Math.min(progress, 100)
    };
  }

  // Helper method to get achievement icon based on category
  getAchievementCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      milestone: 'text-yellow-500',
      engagement: 'text-blue-500',
      social: 'text-green-500',
      resilience: 'text-purple-500',
      health: 'text-red-500',
      financial: 'text-emerald-500',
      growth: 'text-indigo-500',
      phase_completion: 'text-purple-600',
      quarterly: 'text-orange-500',
      extended: 'text-indigo-600',
      mentoring: 'text-cyan-500'
    };
    return colors[category] || 'text-gray-500';
  }

  // Helper method to get phase color
  getPhaseColor(phaseName: string): string {
    const colors: Record<string, string> = {
      foundation: '#10B981', // Green
      reboot: '#3B82F6',      // Blue
      stabilization: '#8B5CF6', // Purple
      growth: '#F59E0B',      // Orange
      mastery: '#EF4444',     // Red
      mentor: '#6366F1'       // Indigo
    };
    return colors[phaseName] || '#6B7280'; // Gray fallback
  }

  // Helper method to calculate days in current phase
  getCurrentPhaseDays(totalDays: number, phaseName: string): number {
    if (phaseName === 'foundation') return totalDays;
    if (phaseName === 'reboot') return totalDays - 30;
    if (phaseName === 'stabilization') return totalDays - 90;
    if (phaseName === 'growth') return totalDays - 180;
    if (phaseName === 'mastery') return totalDays - 270;
    return totalDays - 365; // mentor phase
  }
}

export const gamificationService = new GamificationService();
export default gamificationService;