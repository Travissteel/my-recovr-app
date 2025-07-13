import { api } from '../utils/api';

// Types for dashboard features
export interface DashboardData {
  user: {
    level: number;
    experiencePoints: number;
    achievementPoints: number;
    recoveryScore: number;
  };
  programs: Array<{
    id: string;
    name: string;
    addictionType: string;
    color: string;
    icon: string;
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
    startDate: string;
    lastCheckin?: string;
    lastMood?: number;
    lastCraving?: number;
    dailyCost?: number;
  }>;
  achievements: {
    recent: Array<{
      key: string;
      earnedAt: string;
      points: number;
    }>;
    totalPoints: number;
  };
  todaysChallenge?: {
    id: string;
    title: string;
    description: string;
    type: string;
    difficulty: number;
    pointsReward: number;
    instructions: string[];
    status: string;
  };
  motivation: {
    quotes: Array<{
      content_type: string;
      title?: string;
      content: string;
      author?: string;
      category: string;
    }>;
    healthBenefits?: {
      days: number;
      benefit: string;
    };
  };
  finances: {
    totalSaved: number;
    calculationCount: number;
  };
  health: {
    improvements: Array<{
      improvement_type: string;
      improvement_description: string;
      severity_before: number;
      severity_after: number;
      improvement_date: string;
    }>;
    improvementCount: number;
  };
  trends: {
    mood: Array<{
      day: string;
      avg_mood: number;
      avg_energy: number;
      avg_craving: number;
    }>;
    weeklyAverage: {
      avgMood: number;
      avgEnergy: number;
      avgCraving: number;
    };
  };
  journal: {
    recentEntries: Array<{
      id: string;
      title: string;
      excerpt: string;
      mood: number;
      craving: number;
      date: string;
    }>;
    totalEntries: number;
  };
  community: {
    totalMembers: number;
    activeToday: number;
  };
  insights: Array<{
    type: string;
    message: string;
    icon: string;
  }>;
}

export interface WeeklyReport {
  weekPeriod: {
    start: string;
    end: string;
    weekNumber: number;
  };
  summary: {
    checkInsCompleted: number;
    challengesCompleted: number;
    achievementsEarned: number;
    totalPointsEarned: number;
  };
  trends: {
    avgMood: number;
    avgEnergy: number;
    avgCraving: number;
    avgSleep: number;
    avgStress: number;
  };
  achievements: Array<{
    achievement_key: string;
    earned_at: string;
    points_awarded: number;
  }>;
  challenges: Array<{
    title: string;
    challenge_type: string;
    difficulty_level: number;
    status: string;
    points_earned: number;
    completed_at: string;
  }>;
  insights: string[];
  nextWeekRecommendations: Array<{
    type: string;
    suggestion: string;
    difficulty: string;
  }>;
}

class DashboardService {
  // Get comprehensive dashboard data
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get<DashboardData>('/dashboard');
    return response.data;
  }

  // Get weekly report
  async getWeeklyReport(weekOffset: number = 0): Promise<WeeklyReport> {
    const response = await api.get<WeeklyReport>(
      `/dashboard/weekly-report?week_offset=${weekOffset}`
    );
    return response.data;
  }

  // Helper method to format mood trends for charts
  formatMoodTrends(trends: DashboardData['trends']['mood']) {
    return trends.map(trend => ({
      date: new Date(trend.day).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      mood: parseFloat(trend.avg_mood.toString()),
      energy: parseFloat(trend.avg_energy.toString()),
      craving: parseFloat(trend.avg_craving.toString())
    }));
  }

  // Helper method to get insight icon
  getInsightIcon(type: string): string {
    const icons: Record<string, string> = {
      positive: '🎉',
      achievement: '🏆',
      warning: '⚠️',
      streak: '🔥',
      mood: '😊',
      financial: '💰',
      health: '🏥'
    };
    return icons[type] || '💡';
  }

  // Helper method to calculate recovery score color
  getRecoveryScoreColor(score: number): string {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  }

  // Helper method to format challenge difficulty
  getChallengeDifficultyLabel(difficulty: number): string {
    const labels = ['', 'Easy', 'Medium', 'Hard', 'Expert', 'Master'];
    return labels[difficulty] || 'Unknown';
  }

  // Helper method to get challenge difficulty color
  getChallengeDifficultyColor(difficulty: number): string {
    const colors = ['', 'text-green-500', 'text-yellow-500', 'text-orange-500', 'text-red-500', 'text-purple-500'];
    return colors[difficulty] || 'text-gray-500';
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;