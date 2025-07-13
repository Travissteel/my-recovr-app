import React, { useState, useEffect } from 'react';
import { mentorService, MentorDashboard as MentorDashboardData, LogActivityRequest } from '../../services/mentorService';
import LoadingSpinner from '../LoadingSpinner';

interface MentorDashboardProps {
  className?: string;
}

const MentorDashboard: React.FC<MentorDashboardProps> = ({ className = '' }) => {
  const [dashboardData, setDashboardData] = useState<MentorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'mentees' | 'activities' | 'progress'>('overview');
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await mentorService.getMentorDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch mentor dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogActivity = async (activity: LogActivityRequest) => {
    setIsLoggingActivity(true);
    try {
      await mentorService.logActivity(activity);
      await fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to log activity:', error);
    } finally {
      setIsLoggingActivity(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`card text-center py-8 ${className}`}>
        <p className="text-gray-500">Failed to load mentor dashboard</p>
      </div>
    );
  }

  const { mentor, mentees, recentActivities, engagement } = dashboardData;
  const freeAccessStatus = mentor.freeAccessStatus;
  const lifetimeProgress = mentorService.calculateProgressToLifetime(
    freeAccessStatus.mentorDays, 
    freeAccessStatus.totalActivities
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <span className="text-4xl mr-4">👨‍🏫</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mentor Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Helping others while building your recovery legacy
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`px-3 py-1 rounded-full text-sm font-medium mb-2 ${
              mentorService.getSubscriptionBadgeColor(mentor.subscriptionType || 'free')
            }`}>
              {mentor.isLifetime ? '🏆 Lifetime Member' : 
               mentor.subscriptionType?.toUpperCase() || 'FREE'}
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {mentor.totalPoints} pts
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {mentor.statistics.activeMentees}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Mentees</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {mentor.statistics.thisMonthActivities}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">This Month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {mentor.statistics.totalActivities}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Activities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.floor(freeAccessStatus.mentorDays)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Days Mentoring</div>
          </div>
        </div>
      </div>

      {/* Free Access Status */}
      <FreeAccessStatusCard freeAccessStatus={freeAccessStatus} mentor={mentor} />

      {/* Lifetime Progress (if not lifetime already) */}
      {!mentor.isLifetime && (
        <LifetimeProgressCard 
          progress={lifetimeProgress} 
          freeAccessStatus={freeAccessStatus} 
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'mentees', label: 'Mentees', icon: '👥' },
          { key: 'activities', label: 'Activities', icon: '📝' },
          { key: 'progress', label: 'Progress', icon: '📈' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
              selectedTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <OverviewTab 
          mentees={mentees} 
          recentActivities={recentActivities} 
          engagement={engagement}
          onLogActivity={handleLogActivity}
          isLoggingActivity={isLoggingActivity}
        />
      )}

      {selectedTab === 'mentees' && (
        <MenteesTab mentees={mentees} onLogActivity={handleLogActivity} />
      )}

      {selectedTab === 'activities' && (
        <ActivitiesTab 
          activities={recentActivities} 
          onLogActivity={handleLogActivity}
          isLoggingActivity={isLoggingActivity}
        />
      )}

      {selectedTab === 'progress' && (
        <ProgressTab 
          mentor={mentor} 
          freeAccessStatus={freeAccessStatus}
          lifetimeProgress={lifetimeProgress}
        />
      )}
    </div>
  );
};

// Free Access Status Card
const FreeAccessStatusCard: React.FC<{
  freeAccessStatus: any;
  mentor: any;
}> = ({ freeAccessStatus, mentor }) => {
  if (mentor.isLifetime) {
    return (
      <div className="card bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-3xl mr-3">🏆</span>
            <div>
              <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200">
                Lifetime Member
              </h3>
              <p className="text-purple-600 dark:text-purple-400">
                Thank you for {Math.floor(freeAccessStatus.mentorDays)} days of dedicated mentoring!
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">∞</div>
            <div className="text-xs text-purple-500 dark:text-purple-400">Forever Free</div>
          </div>
        </div>
      </div>
    );
  }

  if (freeAccessStatus.isEligible) {
    return (
      <div className="card bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-3xl mr-3">🎁</span>
            <div>
              <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                Free Premium Access Active
              </h3>
              <p className="text-green-600 dark:text-green-400">
                Keep up the great work to maintain benefits!
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-green-600 dark:text-green-400">
              Expires: {mentor.expiresAt ? new Date(mentor.expiresAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-700 dark:text-green-300">
              {freeAccessStatus.currentMentees}/{freeAccessStatus.requiredMentees}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">Active Mentees</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-700 dark:text-green-300">
              {freeAccessStatus.currentActivity}/{freeAccessStatus.requiredActivity}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">Monthly Activities</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-yellow-200 dark:border-yellow-700">
      <div className="flex items-center mb-4">
        <span className="text-3xl mr-3">⚠️</span>
        <div>
          <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
            Increase Activity for Free Access
          </h3>
          <p className="text-yellow-600 dark:text-yellow-400">
            You need more engagement to qualify for free premium access
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-yellow-700 dark:text-yellow-300">Mentees</span>
          <div className="flex items-center">
            <div className="w-32 bg-yellow-200 rounded-full h-2 mr-2 dark:bg-yellow-800">
              <div 
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${Math.min((freeAccessStatus.currentMentees / freeAccessStatus.requiredMentees) * 100, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {freeAccessStatus.currentMentees}/{freeAccessStatus.requiredMentees}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-yellow-700 dark:text-yellow-300">Monthly Activity</span>
          <div className="flex items-center">
            <div className="w-32 bg-yellow-200 rounded-full h-2 mr-2 dark:bg-yellow-800">
              <div 
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${Math.min((freeAccessStatus.currentActivity / freeAccessStatus.requiredActivity) * 100, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {freeAccessStatus.currentActivity}/{freeAccessStatus.requiredActivity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lifetime Progress Card
const LifetimeProgressCard: React.FC<{
  progress: any;
  freeAccessStatus: any;
}> = ({ progress, freeAccessStatus }) => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        🏆 Progress to Lifetime Membership
      </h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Mentoring Duration</span>
            <span className="font-medium">{Math.floor(freeAccessStatus.mentorDays)}/730 days</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div 
              className="bg-gradient-to-r from-purple-400 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.daysProgress}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Total Activities</span>
            <span className="font-medium">{freeAccessStatus.totalActivities}/240 activities</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.activitiesProgress}%` }}
            />
          </div>
        </div>
        
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-purple-800 dark:text-purple-200">
              Overall Progress
            </span>
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {Math.round(progress.overallProgress)}%
            </span>
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
            Keep mentoring to earn lifetime free access!
          </div>
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  mentees: any[];
  recentActivities: any[];
  engagement: any;
  onLogActivity: (activity: LogActivityRequest) => void;
  isLoggingActivity: boolean;
}> = ({ mentees, recentActivities, engagement, onLogActivity, isLoggingActivity }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Active Mentees */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          👥 Active Mentees ({mentees.length})
        </h3>
        <div className="space-y-3">
          {mentees.slice(0, 3).map((mentee) => (
            <div key={mentee.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                {mentee.firstName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {mentee.firstName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {mentee.currentStreak} day streak
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {mentorService.formatTimeAgo(mentee.assignedAt)}
              </div>
            </div>
          ))}
          {mentees.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No active mentees yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📝 Recent Activities
        </h3>
        <div className="space-y-3">
          {recentActivities.slice(0, 5).map((activity, index) => (
            <div key={index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mr-3">
                {mentorService.getActivityTypeIcon(activity.activityType)}
              </span>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {mentorService.getActivityTypeLabel(activity.activityType)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {activity.description}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  +{activity.pointsEarned}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {mentorService.formatTimeAgo(activity.createdAt)}
                </div>
              </div>
            </div>
          ))}
          {recentActivities.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No activities yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Additional tab components would be implemented similarly...
const MenteesTab: React.FC<{ mentees: any[]; onLogActivity: (activity: LogActivityRequest) => void }> = ({ mentees }) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Your Mentees
    </h3>
    {/* Mentees management interface */}
  </div>
);

const ActivitiesTab: React.FC<{ 
  activities: any[]; 
  onLogActivity: (activity: LogActivityRequest) => void;
  isLoggingActivity: boolean;
}> = ({ activities }) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Activity Log
    </h3>
    {/* Activities log and logging interface */}
  </div>
);

const ProgressTab: React.FC<{ 
  mentor: any; 
  freeAccessStatus: any;
  lifetimeProgress: any;
}> = ({ mentor, freeAccessStatus, lifetimeProgress }) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Progress & Statistics
    </h3>
    {/* Detailed progress tracking */}
  </div>
);

export default MentorDashboard;