import { api } from '../utils/api';

// Types for financial tracking
export interface FinancialOverview {
  summary: {
    totalSaved: number;
    totalPrograms: number;
    averageDailySavings: number;
    lastUpdated: string;
  };
  programs: Array<{
    id: string;
    name: string;
    addictionType: string;
    icon: string;
    color: string;
    dailyCost: number;
    currentStreak: number;
    totalDays: number;
    totalSaved: number;
    startDate: string;
    projections: {
      oneWeek: number;
      twoWeeks: number;
      oneMonth: number;
      threeMonths: number;
      sixMonths: number;
      oneYear: number;
      current: number;
    };
  }>;
  recentLogs: Array<{
    id: string;
    amount: number;
    date: string;
    programName: string;
    addictionType: string;
    calculationMethod: string;
    notes?: string;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    amount: number;
    logCount: number;
  }>;
  achievements: Array<{
    name: string;
    icon: string;
  }>;
  insights: string[];
  motivationalGoals: Array<{
    type: string;
    title: string;
    progress?: number;
    remaining?: number;
    projection?: number;
    description: string;
  }>;
}

export interface FinancialProjections {
  program: {
    id: string;
    name: string;
    addictionType: string;
    dailyCost: number;
    currentDays: number;
    currentSaved: number;
  };
  projections: {
    currentSaved: number;
    projectedAdditional: number;
    totalProjected: number;
    timeframeDays: number;
    additionalDays: number;
    projectionDate: string;
  };
  purchaseAlternatives: Array<{
    item: string;
    cost: number;
    description: string;
  }>;
  motivationalMessages: string[];
  timeframe: string;
}

export interface FinancialGoals {
  currentSavings: number;
  milestones: {
    completed: Array<{
      amount: number;
      title: string;
      description: string;
    }>;
    next?: {
      amount: number;
      title: string;
      description: string;
    };
    progressToNext: number;
  };
  challenges: Array<{
    title: string;
    description: string;
    difficulty: string;
    reward: string;
  }>;
  achievements: number;
  insights: string[];
}

export interface UpdateDailyCostRequest {
  dailyCost: number;
}

export interface LogSavingsRequest {
  programId: string;
  amount: number;
  calculationMethod?: string;
  notes?: string;
  savedDate?: string;
}

class FinancialService {
  // Get comprehensive financial overview
  async getFinancialOverview(): Promise<FinancialOverview> {
    const response = await api.get<FinancialOverview>('/financial/overview');
    return response.data;
  }

  // Update daily cost for a program
  async updateDailyCost(programId: string, data: UpdateDailyCostRequest): Promise<void> {
    await api.put(`/financial/program/${programId}/daily-cost`, data);
  }

  // Log manual savings entry
  async logSavings(data: LogSavingsRequest): Promise<void> {
    await api.post('/financial/log-savings', data);
  }

  // Get financial projections for a program
  async getProjections(
    programId: string, 
    timeframe: string = '1_year'
  ): Promise<FinancialProjections> {
    const response = await api.get<FinancialProjections>(
      `/financial/projections/${programId}?timeframe=${timeframe}`
    );
    return response.data;
  }

  // Get savings goals and milestones
  async getFinancialGoals(): Promise<FinancialGoals> {
    const response = await api.get<FinancialGoals>('/financial/goals');
    return response.data;
  }

  // Helper method to format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Helper method to calculate weekly/monthly savings rate
  calculateSavingsRate(totalSaved: number, days: number): { weekly: number; monthly: number } {
    const dailyRate = days > 0 ? totalSaved / days : 0;
    return {
      weekly: dailyRate * 7,
      monthly: dailyRate * 30
    };
  }

  // Helper method to get achievement color
  getAchievementColor(achievementCount: number): string {
    if (achievementCount >= 8) return 'text-purple-600';
    if (achievementCount >= 5) return 'text-blue-600';
    if (achievementCount >= 3) return 'text-green-600';
    if (achievementCount >= 1) return 'text-yellow-600';
    return 'text-gray-600';
  }

  // Helper method to get savings tier
  getSavingsTier(totalSaved: number): { tier: string; color: string; nextTier?: number } {
    if (totalSaved >= 10000) return { tier: 'Legendary Saver', color: 'purple' };
    if (totalSaved >= 5000) return { tier: 'Elite Saver', color: 'indigo', nextTier: 10000 };
    if (totalSaved >= 2500) return { tier: 'Master Saver', color: 'blue', nextTier: 5000 };
    if (totalSaved >= 1000) return { tier: 'Advanced Saver', color: 'green', nextTier: 2500 };
    if (totalSaved >= 500) return { tier: 'Skilled Saver', color: 'yellow', nextTier: 1000 };
    if (totalSaved >= 100) return { tier: 'Rising Saver', color: 'orange', nextTier: 500 };
    if (totalSaved >= 50) return { tier: 'Beginner Saver', color: 'red', nextTier: 100 };
    return { tier: 'New Saver', color: 'gray', nextTier: 50 };
  }

  // Helper method to generate purchase suggestions
  generatePurchaseSuggestions(amount: number): Array<{ category: string; items: string[] }> {
    const suggestions = [];

    if (amount >= 50) {
      suggestions.push({
        category: 'Self Care',
        items: ['Spa day', 'Massage', 'New workout gear', 'Skincare routine']
      });
    }

    if (amount >= 200) {
      suggestions.push({
        category: 'Learning',
        items: ['Online course', 'Professional certification', 'Books and materials', 'Workshop attendance']
      });
    }

    if (amount >= 500) {
      suggestions.push({
        category: 'Health & Fitness',
        items: ['Gym membership', 'Personal trainer sessions', 'Health checkup', 'Fitness equipment']
      });
    }

    if (amount >= 1000) {
      suggestions.push({
        category: 'Experiences',
        items: ['Weekend getaway', 'Concert tickets', 'Adventure activity', 'Fine dining experience']
      });
    }

    if (amount >= 2000) {
      suggestions.push({
        category: 'Investment',
        items: ['Emergency fund', 'Investment account', 'Home improvement', 'Vehicle upgrade']
      });
    }

    return suggestions;
  }

  // Helper method to calculate compound savings
  calculateCompoundSavings(dailySavings: number, years: number, interestRate: number = 0.05): number {
    const monthlyContribution = dailySavings * 30;
    const monthlyRate = interestRate / 12;
    const months = years * 12;
    
    // Future value of annuity formula
    return monthlyContribution * (((1 + monthlyRate) ** months - 1) / monthlyRate);
  }

  // Helper method to get motivational message based on savings
  getMotivationalMessage(totalSaved: number, dailySavings: number): string {
    const messages = [
      `You've saved ${this.formatCurrency(totalSaved)} through your recovery journey!`,
      `At ${this.formatCurrency(dailySavings)} per day, you're building real wealth!`,
      `Your recovery is literally paying dividends.`,
      `Every day clean is money in the bank.`,
      `Financial freedom follows personal freedom.`,
      `You're not just saving money, you're investing in your future.`,
      `Recovery pays - in more ways than one!`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}

export const financialService = new FinancialService();
export default financialService;