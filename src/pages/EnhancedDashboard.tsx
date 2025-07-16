import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import LoadingSpinner from '../components/LoadingSpinner';

// Import enhanced components
import GamificationDashboard from '../components/enhanced/GamificationDashboard';
import InteractiveCalendar from '../components/enhanced/InteractiveCalendar';
import FinancialDashboard from '../components/enhanced/FinancialDashboard';
import NotificationPreferences from '../components/enhanced/NotificationPreferences';
import DailyChallenges from '../components/enhanced/DailyChallenges';
import HealthBenefitsTimeline from '../components/enhanced/HealthBenefitsTimeline';
import MentorEligibilityCard from '../components/mentor/MentorEligibilityCard';
import MentorDashboard from '../components/mentor/MentorDashboard';

// Import existing components
import LifeTree from '../components/LifeTree';
import StreakCounter from '../components/StreakCounter';
import CrisisButton from '../components/CrisisButton';

interface DashboardData {
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
  todaysChallenge?: any;
  insights: Array<{
    type: string;
    message: string;
    icon: string;
  }>;
  finances: {
    totalSaved: number;
    calculationCount: number;
  };
}

type DashboardTab = 'overview' | 'gamification' | 'calendar' | 'financial' | 'challenges' | 'health' | 'mentor' | 'settings';

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await dashboardService.getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleAchievementEarned = (achievementKey: string, points: number) => {
    // Update dashboard data when new achievements are earned
    if (dashboardData) {
      setDashboardData({
        ...dashboardData,
        user: {
          ...dashboardData.user,
          achievementPoints: dashboardData.user.achievementPoints + points
        }
      });
    }
  };

  const handleChallengeComplete = (challengeId: string, points: number) => {
    // Update dashboard data when challenges are completed
    handleAchievementEarned('challenge_complete', points);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const dashboardTabs = [
    { key: 'overview', label: 'Overview', icon: '🏠', description: 'Main dashboard with key metrics' },
    { key: 'gamification', label: 'Progress', icon: '🏆', description: 'Achievements and gamification' },
    { key: 'calendar', label: 'Calendar', icon: '📅', description: 'Mood tracking and triggers' },
    { key: 'financial', label: 'Financial', icon: '💰', description: 'Money saved and projections' },
    { key: 'challenges', label: 'Challenges', icon: '🎯', description: 'Daily challenges and tasks' },
    { key: 'health', label: 'Health', icon: '🏥', description: 'Health benefits timeline' },
    { key: 'mentor', label: 'Mentor', icon: '👨‍🏫', description: 'Mentor program and free access' },
    { key: 'settings', label: 'Settings', icon: '⚙️', description: 'Notification preferences' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.firstName}! 🌟
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Your comprehensive recovery dashboard with advanced tracking features
            </p>
          </div>
          {dashboardData && (
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Recovery Score: {dashboardData.user.recoveryScore}/100
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Level {dashboardData.user.level} • {dashboardData.user.achievementPoints} XP
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {dashboardData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {dashboardData.programs.length}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Active Programs</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.max(...dashboardData.programs.map(p => p.currentStreak), 0)}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">Best Streak</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {dashboardData.user.achievementPoints}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Achievement Points</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${dashboardData.finances.totalSaved.toFixed(0)}
              </div>
              <div className="text-sm text-emerald-700 dark:text-emerald-300">Money Saved</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {dashboardTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as DashboardTab)}
              className={`p-4 rounded-lg text-center transition-all hover:shadow-md ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-2xl mb-2">{tab.icon}</div>
              <div className="font-medium text-sm">{tab.label}</div>
              <div className={`text-xs mt-1 ${
                activeTab === tab.key ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {tab.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <OverviewTab 
            dashboardData={dashboardData}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'gamification' && (
          <GamificationDashboard 
            onAchievementClick={(achievement) => {
              console.log('Achievement clicked:', achievement);
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <InteractiveCalendar />
        )}

        {activeTab === 'financial' && (
          <FinancialDashboard />
        )}

        {activeTab === 'challenges' && (
          <DailyChallenges 
            onChallengeComplete={handleChallengeComplete}
          />
        )}

        {activeTab === 'health' && (
          <HealthBenefitsTimeline 
            programId={dashboardData?.programs[0]?.id}
          />
        )}

        {activeTab === 'mentor' && (
          <div className="space-y-6">
            <MentorEligibilityCard 
              onApplicationClick={() => {
                console.log('Open mentor application modal');
                // You could implement a modal here
              }}
              onDashboardClick={() => {
                console.log('Switch to mentor dashboard view');
                // You could implement a sub-view or modal here
              }}
            />
            <MentorDashboard />
          </div>
        )}

        {activeTab === 'settings' && (
          <NotificationPreferences />
        )}
      </div>

      {/* Emergency Crisis Button - Always Visible */}
      <div className="fixed bottom-6 right-6 z-50">
        <CrisisButton 
          onCrisisActivated={(crisisType) => {
            console.log('Crisis activated:', crisisType);
          }}
        />
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  dashboardData: DashboardData | null;
  onTabChange: (tab: DashboardTab) => void;
}> = ({ dashboardData, onTabChange }) => {
  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mentor Program Highlight */}
      <div className="lg:col-span-2">
        <MentorEligibilityCard 
          onApplicationClick={() => onTabChange('mentor')}
          onDashboardClick={() => onTabChange('mentor')}
        />
      </div>

      {/* Today's Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Challenge Preview */}
        {dashboardData.todaysChallenge && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Today's Challenge
              </h3>
              <button 
                onClick={() => onTabChange('challenges')}
                className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
              >
                View All →
              </button>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {dashboardData.todaysChallenge.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {dashboardData.todaysChallenge.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-600 dark:text-purple-400">
                  +{dashboardData.todaysChallenge.pointsReward} points
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  dashboardData.todaysChallenge.status === 'completed' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {dashboardData.todaysChallenge.status === 'completed' ? '✅ Completed' : '🎯 Available'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Financial Progress
            </h3>
            <button 
              onClick={() => onTabChange('financial')}
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              View Details →
            </button>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              ${dashboardData.finances.totalSaved.toFixed(2)}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              Total money saved through recovery
            </div>
            {dashboardData.finances.calculationCount > 0 && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                Based on {dashboardData.finances.calculationCount} tracked savings
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Programs Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Recovery Programs
          </h3>
          <button 
            onClick={() => onTabChange('gamification')}
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            View Progress →
          </button>
        </div>
        <StreakCounter 
          programs={dashboardData.programs.map(p => ({
            id: p.id,
            programName: p.name,
            currentStreak: p.currentStreak,
            longestStreak: p.longestStreak,
            startDate: p.startDate,
            status: 'active',
            addictionType: p.addictionType,
            addictionColor: p.color,
            lastCheckin: p.lastCheckin,
            lastMood: p.lastMood
          }))}
          onCreateProgram={() => {
            console.log('Create new program');
          }}
        />
      </div>

      {/* Insights and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Life Tree Visualization */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recovery Growth
          </h3>
          <LifeTree 
            streakDays={Math.max(...dashboardData.programs.map(p => p.currentStreak), 0)}
            totalPrograms={dashboardData.programs.length}
            completedMilestones={Math.floor((Math.max(...dashboardData.programs.map(p => p.currentStreak), 0)) / 7)}
          />
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button 
              onClick={() => onTabChange('calendar')}
              className="w-full p-4 text-left bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">📅</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Log Today's Mood</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Track your daily progress</div>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => onTabChange('challenges')}
              className="w-full p-4 text-left bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🎯</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Complete Challenge</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Earn points and build habits</div>
                </div>
              </div>
            </button>

            <button 
              onClick={() => onTabChange('health')}
              className="w-full p-4 text-left bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏥</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">View Health Benefits</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">See your recovery timeline</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Insights */}
      {dashboardData.insights.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recovery Insights
          </h3>
          <div className="space-y-3">
            {dashboardData.insights.map((insight, index) => (
              <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start">
                  <span className="text-xl mr-3">{insight.icon}</span>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {insight.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboard;