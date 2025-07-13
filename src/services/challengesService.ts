import { api } from '../utils/api';

// Types for challenges functionality
export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  difficulty_level: number;
  points_reward: number;
  instructions: string[];
  is_active: boolean;
  created_at: string;
}

export interface UserDailyChallenge {
  id: string;
  challenge_id: string;
  challenge_date: string;
  status: 'started' | 'completed' | 'skipped';
  completion_notes?: string;
  completion_photo_url?: string;
  points_earned: number;
  completed_at?: string;
  created_at: string;
  // Joined challenge data
  title?: string;
  description?: string;
  challenge_type?: string;
  difficulty_level?: number;
  instructions?: string[];
}

export interface ChallengesOverview {
  todaysChallenge?: {
    challenge: DailyChallenge;
    userProgress?: UserDailyChallenge;
  };
  availableChallenges: DailyChallenge[];
  recentCompletions: UserDailyChallenge[];
  statistics: {
    totalCompleted: number;
    totalPoints: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
  };
  achievements: Array<{
    name: string;
    description: string;
    earned: boolean;
    progress?: number;
  }>;
}

export interface ChallengeCompletion {
  challengeId: string;
  status: 'completed' | 'skipped';
  completionNotes?: string;
  completionPhotoUrl?: string;
}

export interface ChallengeHistory {
  challenges: UserDailyChallenge[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  filters: {
    type?: string;
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

class ChallengesService {
  // Get daily challenges overview
  async getChallengesOverview(): Promise<ChallengesOverview> {
    // Note: This endpoint would need to be created on the backend
    // For now, we'll simulate the structure based on the existing dashboard endpoint
    const response = await api.get<any>('/dashboard');
    
    // Transform the dashboard data to match our challenges structure
    const challengeData: ChallengesOverview = {
      todaysChallenge: response.data.todaysChallenge ? {
        challenge: {
          id: response.data.todaysChallenge.id,
          title: response.data.todaysChallenge.title,
          description: response.data.todaysChallenge.description,
          challenge_type: response.data.todaysChallenge.type,
          difficulty_level: response.data.todaysChallenge.difficulty,
          points_reward: response.data.todaysChallenge.pointsReward,
          instructions: response.data.todaysChallenge.instructions,
          is_active: true,
          created_at: new Date().toISOString()
        },
        userProgress: response.data.todaysChallenge.status !== 'available' ? {
          id: 'temp',
          challenge_id: response.data.todaysChallenge.id,
          challenge_date: new Date().toISOString().split('T')[0],
          status: response.data.todaysChallenge.status,
          points_earned: response.data.todaysChallenge.pointsReward,
          created_at: new Date().toISOString()
        } : undefined
      } : undefined,
      availableChallenges: [],
      recentCompletions: [],
      statistics: {
        totalCompleted: 0,
        totalPoints: 0,
        completionRate: 0,
        currentStreak: 0,
        longestStreak: 0
      },
      achievements: []
    };

    return challengeData;
  }

  // Get available challenges
  async getAvailableChallenges(): Promise<DailyChallenge[]> {
    // This would typically fetch from /challenges/available
    // For now, return sample data
    return [];
  }

  // Complete a challenge
  async completeChallenge(completion: ChallengeCompletion): Promise<void> {
    // This would POST to /challenges/complete
    await api.post('/challenges/complete', completion);
  }

  // Get challenge history
  async getChallengeHistory(
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<ChallengeHistory['filters']>
  ): Promise<ChallengeHistory> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateRange?.start) params.append('startDate', filters.dateRange.start);
    if (filters?.dateRange?.end) params.append('endDate', filters.dateRange.end);

    const response = await api.get<ChallengeHistory>(`/challenges/history?${params.toString()}`);
    return response.data;
  }

  // Get challenge of the day
  async getTodaysChallenge(): Promise<{ challenge: DailyChallenge; userProgress?: UserDailyChallenge } | null> {
    try {
      const response = await api.get<any>('/challenges/today');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch today\'s challenge:', error);
      return null;
    }
  }

  // Helper method to get difficulty label
  getDifficultyLabel(level: number): string {
    const labels = ['', 'Easy', 'Medium', 'Hard', 'Expert', 'Master'];
    return labels[level] || 'Unknown';
  }

  // Helper method to get difficulty color
  getDifficultyColor(level: number): string {
    const colors = [
      'text-gray-500',
      'text-green-500',
      'text-yellow-500', 
      'text-orange-500',
      'text-red-500',
      'text-purple-500'
    ];
    return colors[level] || 'text-gray-500';
  }

  // Helper method to get challenge type icon
  getChallengeTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      mindfulness: '🧘',
      physical: '💪',
      social: '👥',
      learning: '📚',
      creativity: '🎨',
      nutrition: '🥗',
      productivity: '✅',
      self_care: '🌸',
      gratitude: '🙏',
      adventure: '🌟'
    };
    return icons[type] || '🎯';
  }

  // Helper method to get status color
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'skipped':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
      case 'started':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  }

  // Helper method to calculate completion streak
  calculateCompletionStreak(challenges: UserDailyChallenge[]): number {
    let streak = 0;
    const sortedChallenges = challenges
      .filter(c => c.status === 'completed')
      .sort((a, b) => new Date(b.challenge_date).getTime() - new Date(a.challenge_date).getTime());

    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const challenge of sortedChallenges) {
      const challengeDate = new Date(challenge.challenge_date);
      challengeDate.setHours(0, 0, 0, 0);

      if (challengeDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // Helper method to get challenge categories
  getChallengeCategories(): Array<{ key: string; label: string; description: string }> {
    return [
      {
        key: 'mindfulness',
        label: 'Mindfulness',
        description: 'Meditation, breathing exercises, and present-moment awareness'
      },
      {
        key: 'physical',
        label: 'Physical',
        description: 'Exercise, movement, and physical wellness activities'
      },
      {
        key: 'social',
        label: 'Social',
        description: 'Connection, communication, and community engagement'
      },
      {
        key: 'learning',
        label: 'Learning',
        description: 'Education, skill development, and personal growth'
      },
      {
        key: 'creativity',
        label: 'Creativity',
        description: 'Art, writing, music, and creative expression'
      },
      {
        key: 'self_care',
        label: 'Self Care',
        description: 'Personal wellness, relaxation, and nurturing activities'
      }
    ];
  }

  // Helper method to validate challenge completion
  validateChallengeCompletion(completion: ChallengeCompletion): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!completion.challengeId) {
      errors.push('Challenge ID is required');
    }

    if (!['completed', 'skipped'].includes(completion.status)) {
      errors.push('Status must be either completed or skipped');
    }

    if (completion.status === 'completed' && completion.completionNotes && completion.completionNotes.length < 10) {
      errors.push('Completion notes should be at least 10 characters when provided');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to get sample challenges (for demo purposes)
  getSampleChallenges(): DailyChallenge[] {
    return [
      {
        id: '1',
        title: 'Morning Gratitude',
        description: 'Write down 3 things you\'re grateful for today',
        challenge_type: 'mindfulness',
        difficulty_level: 1,
        points_reward: 10,
        instructions: [
          'Find a quiet moment this morning',
          'Think about your life and recent experiences',
          'Write down 3 specific things you\'re grateful for',
          'Reflect on why each one matters to you'
        ],
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Mindful Walking',
        description: 'Take a 15-minute mindful walk outdoors',
        challenge_type: 'physical',
        difficulty_level: 2,
        points_reward: 20,
        instructions: [
          'Choose a peaceful outdoor location',
          'Walk slowly and deliberately',
          'Focus on each step and your breathing',
          'Notice the sounds, smells, and sights around you',
          'Stay present throughout the walk'
        ],
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Connect with Someone',
        description: 'Have a meaningful conversation with a friend or family member',
        challenge_type: 'social',
        difficulty_level: 2,
        points_reward: 25,
        instructions: [
          'Choose someone you care about',
          'Reach out via call, video chat, or in person',
          'Ask open-ended questions about their life',
          'Listen actively without judgment',
          'Share something meaningful about your own journey'
        ],
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
  }
}

export const challengesService = new ChallengesService();
export default challengesService;