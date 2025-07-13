import { api } from '../utils/api';

// Types for calendar functionality
export interface CalendarDay {
  date: string;
  checkins: Array<{
    programId: string;
    programName: string;
    addictionType: string;
    color: string;
    icon: string;
    mood?: number;
    energy?: number;
    craving?: number;
    sleep?: number;
    stress?: number;
    productivity?: number;
    triggerNotes?: string;
    gratitudeNotes?: string;
    recoveryActions?: string[];
  }>;
  triggers: Array<{
    type: string;
    intensity: number;
    situation: string;
    copingStrategy: string;
    outcome: string;
    notes: string;
  }>;
  achievements: Array<{
    key: string;
    points: number;
  }>;
  challenges: Array<{
    title: string;
    type: string;
    difficulty: number;
    status: string;
    points: number;
  }>;
  dayType: 'normal' | 'streak' | 'relapse' | 'milestone';
  overallMood?: number;
  streakDays: Record<string, {
    programName: string;
    addictionType: string;
    color: string;
    icon: string;
    streakDay: number;
  }>;
}

export interface CalendarData {
  month: {
    year: number;
    month: number;
    startDate: string;
    endDate: string;
  };
  programs: Array<{
    id: string;
    name: string;
    addictionType: string;
    color: string;
    icon: string;
    currentStreak: number;
    totalDays: number;
  }>;
  calendarData: CalendarDay[];
  monthlyStats: {
    totalCheckins: number;
    totalTriggers: number;
    totalAchievements: number;
    completedChallenges: number;
    averageMood: number;
    streakDays: number;
    milestoneDays: number;
  };
}

export interface DayDetailData {
  date: string;
  checkins: Array<any>;
  triggers: Array<any>;
  achievements: Array<any>;
  challenges: Array<any>;
  journals: Array<any>;
  summary: {
    averageMood?: number;
    averageCraving?: number;
    triggerCount: number;
    achievementCount: number;
    challengeCompletions: number;
    journalEntries: number;
  };
}

export interface LogTriggerRequest {
  triggerDate: string;
  triggerType: string;
  intensityLevel: number;
  situationDescription?: string;
  copingStrategyUsed?: string;
  outcome?: string;
  notes?: string;
}

export interface UpdateMoodRequest {
  programId: string;
  moodRating: number;
  notes?: string;
}

export interface MoodTrendsData {
  trends: Array<{
    date: string;
    avg_mood: number;
    avg_energy: number;
    avg_craving: number;
    checkin_count: number;
  }>;
  period: {
    days: number;
    programId: string;
  };
}

class CalendarService {
  // Get calendar data for a specific month
  async getCalendarMonth(year: number, month: number): Promise<CalendarData> {
    const response = await api.get<CalendarData>(`/calendar/month/${year}/${month}`);
    return response.data;
  }

  // Get detailed data for a specific day
  async getDayDetail(date: string): Promise<DayDetailData> {
    const response = await api.get<DayDetailData>(`/calendar/day/${date}`);
    return response.data;
  }

  // Log a trigger event
  async logTrigger(data: LogTriggerRequest): Promise<void> {
    await api.post('/calendar/trigger', data);
  }

  // Update mood for a specific date
  async updateMood(date: string, data: UpdateMoodRequest): Promise<void> {
    await api.put(`/calendar/mood/${date}`, data);
  }

  // Get mood trends for visualization
  async getMoodTrends(days: number = 30, programId?: string): Promise<MoodTrendsData> {
    const params = new URLSearchParams({ days: days.toString() });
    if (programId) {
      params.append('programId', programId);
    }

    const response = await api.get<MoodTrendsData>(`/calendar/mood-trends?${params.toString()}`);
    return response.data;
  }

  // Helper method to get mood color
  getMoodColor(mood: number): string {
    if (mood >= 8) return 'green';
    if (mood >= 6) return 'yellow';
    if (mood >= 4) return 'orange';
    return 'red';
  }

  // Helper method to get mood emoji
  getMoodEmoji(mood: number): string {
    if (mood >= 9) return '😄';
    if (mood >= 7) return '😊';
    if (mood >= 5) return '😐';
    if (mood >= 3) return '😕';
    return '😢';
  }

  // Helper method to get trigger intensity color
  getTriggerIntensityColor(intensity: number): string {
    if (intensity >= 8) return 'red';
    if (intensity >= 6) return 'orange';
    if (intensity >= 4) return 'yellow';
    return 'green';
  }

  // Helper method to get day type styling
  getDayTypeStyle(dayType: CalendarDay['dayType']): string {
    switch (dayType) {
      case 'milestone':
        return 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/50 text-yellow-900 dark:text-yellow-100';
      case 'streak':
        return 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 text-green-900 dark:text-green-100';
      case 'relapse':
        return 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 text-red-900 dark:text-red-100';
      default:
        return 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600';
    }
  }

  // Helper method to format date for display
  formatDateForDisplay(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Helper method to calculate streak visualization
  calculateStreakDays(programs: CalendarData['programs'], currentDate: Date): Record<string, any> {
    const streakDays: Record<string, any> = {};

    programs.forEach(program => {
      for (let i = 0; i < program.currentStreak && i < 31; i++) {
        const streakDate = new Date(currentDate);
        streakDate.setDate(streakDate.getDate() - i);
        
        const dateStr = streakDate.toISOString().split('T')[0];
        streakDays[dateStr] = {
          ...streakDays[dateStr],
          [program.id]: {
            programName: program.name,
            addictionType: program.addictionType,
            color: program.color,
            icon: program.icon,
            streakDay: i + 1
          }
        };
      }
    });

    return streakDays;
  }

  // Helper method to get week boundaries
  getWeekBoundaries(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  // Helper method to validate trigger data
  validateTriggerData(data: LogTriggerRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.triggerType.trim()) {
      errors.push('Trigger type is required');
    }

    if (data.intensityLevel < 1 || data.intensityLevel > 10) {
      errors.push('Intensity level must be between 1 and 10');
    }

    if (!data.triggerDate) {
      errors.push('Trigger date is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to get common trigger types
  getCommonTriggerTypes(): string[] {
    return [
      'Stress',
      'Boredom', 
      'Social Pressure',
      'Emotional',
      'Routine Disruption',
      'Anxiety',
      'Depression',
      'Anger',
      'Loneliness',
      'HALT (Hungry/Angry/Lonely/Tired)',
      'Work Pressure',
      'Relationship Issues',
      'Financial Stress',
      'Health Concerns',
      'Environmental Triggers'
    ];
  }

  // Helper method to get coping strategies
  getCommonCopingStrategies(): string[] {
    return [
      'Deep breathing exercises',
      'Meditation or mindfulness',
      'Called a friend or support person',
      'Physical exercise',
      'Journaling or writing',
      'Distraction activities',
      'Recovery reading',
      'Prayer or spiritual practice',
      'Took a walk',
      'Listened to music',
      'Used recovery app',
      'Attended support meeting',
      'Practiced gratitude',
      'Engaged in hobby',
      'Sought professional help'
    ];
  }

  // Helper method to format month/year for navigation
  formatMonthYear(year: number, month: number): string {
    return new Date(year, month - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }
}

export const calendarService = new CalendarService();
export default calendarService;