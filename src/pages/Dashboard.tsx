import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import LifeTree from '../components/LifeTree';
import StreakCounter from '../components/StreakCounter';
import DailyTasks from '../components/DailyTasks';
import CrisisButton from '../components/CrisisButton';

interface DashboardStats {
  totalPrograms: number;
  totalCheckins: number;
  averageMood: number;
  bestStreak: number;
  crisisInterventions: number;
}

interface Program {
  id: string;
  programName: string;
  currentStreak: number;
  longestStreak: number;
  startDate: string;
  status: string;
  addictionType: string;
  addictionColor: string;
  lastCheckin?: string;
  lastMood?: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get<{
          programs: Program[];
          stats: DashboardStats;
        }>('/users/dashboard');
        
        setPrograms(response.data.programs);
        setStats(response.data.stats);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's your recovery progress overview
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Programs
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalPrograms || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Check-ins
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalCheckins || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Best Streak
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.bestStreak || 0} days
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">😊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Mood
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.averageMood ? stats.averageMood.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Life Tree Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LifeTree 
          streakDays={stats?.bestStreak || 0}
          totalPrograms={stats?.totalPrograms || 0}
          completedMilestones={Math.floor((stats?.bestStreak || 0) / 7)} // Weekly milestones
        />
        
        {/* Quick Stats Card */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recovery Progress
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Recovery Days</span>
              <span className="font-bold text-emerald-600">{stats?.totalCheckins || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Programs</span>
              <span className="font-bold text-blue-600">{stats?.totalPrograms || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Mood Average</span>
              <span className="font-bold text-purple-600">
                {stats?.averageMood ? `${stats.averageMood.toFixed(1)}/10` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Best Streak</span>
              <span className="font-bold text-orange-600">{stats?.bestStreak || 0} days</span>
            </div>
          </div>
          
          {/* Progress Percentage */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
              <span className="font-medium">{Math.min(((stats?.bestStreak || 0) / 90) * 100, 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((stats?.bestStreak || 0) / 90) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Programs with Enhanced Streak Counter */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Your Recovery Programs
        </h2>
        <StreakCounter 
          programs={programs}
          onCreateProgram={() => {
            // Navigate to program creation or show modal
            console.log('Create new program');
          }}
        />
      </div>

      {/* Daily Tasks and Gamification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DailyTasks 
            totalXP={stats?.totalCheckins ? stats.totalCheckins * 5 : 0}
            onCompleteTask={(taskId) => {
              console.log('Task completed:', taskId);
              // Add XP to user account
            }}
          />
        </div>
        
        <div className="space-y-6">
          <CrisisButton 
            onCrisisActivated={(crisisType) => {
              console.log('Crisis activated:', crisisType);
              // Log crisis intervention
            }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <span className="text-3xl mb-2 block">🆘</span>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Access crisis support resources
          </p>
          <button className="btn-danger">
            Get Support Now
          </button>
        </div>

        <div className="card text-center">
          <span className="text-3xl mb-2 block">👥</span>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Community
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Connect with others on their journey
          </p>
          <button className="btn-primary">
            Join Community
          </button>
        </div>

        <div className="card text-center">
          <span className="text-3xl mb-2 block">🛠️</span>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Tools
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Access blocking and prevention tools
          </p>
          <button className="btn-secondary">
            View Tools
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;