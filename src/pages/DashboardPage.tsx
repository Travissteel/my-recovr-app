import React from 'react';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Mock data - in real app this would come from API
  const streakData = {
    current: 23,
    longest: 45,
    total: 156
  };

  const quickStats = [
    { label: 'Days Clean', value: streakData.current, icon: '🌟' },
    { label: 'Longest Streak', value: streakData.longest, icon: '🏆' },
    { label: 'Total Days', value: streakData.total, icon: '📊' },
    { label: 'Community Points', value: 1250, icon: '🎯' }
  ];

  const recentActivities = [
    { type: 'check-in', message: 'Completed daily check-in', time: '2 hours ago', icon: '✅' },
    { type: 'milestone', message: 'Reached 20-day milestone!', time: '3 days ago', icon: '🎉' },
    { type: 'community', message: 'Posted in support group', time: '5 days ago', icon: '💬' },
    { type: 'program', message: 'Started "Mindful Recovery" program', time: '1 week ago', icon: '📚' }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You're doing great! Here's your recovery overview for today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index} className="p-6 text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Daily Check-in */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Daily Check-in
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              How are you feeling today? Complete your daily check-in to track your progress.
            </p>
            <Link to="/check-in">
              <Button className="w-full">
                Complete Check-in 📝
              </Button>
            </Link>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link to="/programs" className="block">
                <Button variant="outline" className="w-full justify-start">
                  📚 Browse Programs
                </Button>
              </Link>
              <Link to="/community" className="block">
                <Button variant="outline" className="w-full justify-start">
                  👥 Join Community
                </Button>
              </Link>
              <Link to="/progress" className="block">
                <Button variant="outline" className="w-full justify-start">
                  📈 View Progress
                </Button>
              </Link>
              <Link to="/crisis" className="block">
                <Button variant="outline" className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50">
                  🆘 Crisis Support
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <span className="text-lg">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Motivational Quote */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Daily Inspiration
            </h2>
            <blockquote className="text-gray-700 dark:text-gray-300 italic mb-2">
              "Recovery is not a race. You don't have to feel guilty if it takes you longer than you thought it would."
            </blockquote>
            <cite className="text-sm text-gray-600 dark:text-gray-400">
              - Anonymous
            </cite>
          </Card>
        </div>

        {/* Progress Visualization */}
        <Card className="p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Your Progress Journey
          </h2>
          <div className="flex items-center space-x-4 overflow-x-auto pb-4">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
              <div
                key={day}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  day <= streakData.current
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {streakData.current} days clean and counting! 🌟
          </p>
        </Card>
      </div>
    </Layout>
  );
};