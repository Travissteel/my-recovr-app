import React, { useState, useEffect } from 'react';
import { NotificationPreferences, NotificationPreferencesResponse } from '../../services/notificationService';
import { notificationService } from '../../services/notificationService';
import LoadingSpinner from '../LoadingSpinner';

interface NotificationPreferencesProps {
  className?: string;
}

const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({ className = '' }) => {
  const [preferencesData, setPreferencesData] = useState<NotificationPreferencesResponse | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'settings' | 'schedule' | 'content'>('settings');
  const [suggestedSchedules, setSuggestedSchedules] = useState<any>(null);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const [prefsData, schedulesData] = await Promise.all([
          notificationService.getPreferences(),
          notificationService.getSuggestedSchedules()
        ]);
        setPreferencesData(prefsData);
        setPreferences(prefsData.preferences);
        setSuggestedSchedules(schedulesData);
      } catch (error) {
        console.error('Failed to fetch notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const updatePreference = (section: keyof NotificationPreferences, key: string, value: any) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      [section]: {
        ...preferences[section],
        [key]: value
      }
    });
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setIsSaving(true);
    try {
      await notificationService.updatePreferences(preferences);
      // Show success message
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Show error message
    } finally {
      setIsSaving(false);
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.sendTestNotification({ type: 'motivation' });
      // Show success message
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!preferences || !preferencesData) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">Failed to load notification preferences</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notification Preferences
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Customize your motivational notifications and reminders
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={testNotification}
              className="btn-secondary"
            >
              🧪 Test Notification
            </button>
            <button
              onClick={savePreferences}
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'settings', label: 'Settings', icon: '⚙️' },
          { key: 'schedule', label: 'Schedule', icon: '📅' },
          { key: 'content', label: 'Content', icon: '💬' }
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
      {selectedTab === 'settings' && (
        <SettingsTab 
          preferences={preferences}
          onUpdatePreference={updatePreference}
        />
      )}

      {selectedTab === 'schedule' && (
        <ScheduleTab 
          preferences={preferences}
          suggestedSchedules={suggestedSchedules}
          onUpdatePreference={updatePreference}
        />
      )}

      {selectedTab === 'content' && (
        <ContentTab 
          preferencesData={preferencesData}
          preferences={preferences}
          onUpdatePreference={updatePreference}
        />
      )}
    </div>
  );
};

// Settings Tab Component
const SettingsTab: React.FC<{
  preferences: NotificationPreferences;
  onUpdatePreference: (section: keyof NotificationPreferences, key: string, value: any) => void;
}> = ({ preferences, onUpdatePreference }) => {
  const notificationSections = [
    {
      key: 'dailyMotivation',
      title: 'Daily Motivation',
      description: 'Receive inspiring messages to start your day',
      icon: '🌅'
    },
    {
      key: 'streakReminders',
      title: 'Streak Celebrations',
      description: 'Get notified about milestones and achievements',
      icon: '🔥'
    },
    {
      key: 'cravingSupport',
      title: 'Craving Support',
      description: 'Quick access to help during difficult moments',
      icon: '🆘'
    },
    {
      key: 'checkInReminders',
      title: 'Check-in Reminders',
      description: 'Daily reminders to log your progress',
      icon: '✅'
    },
    {
      key: 'challengeNotifications',
      title: 'Daily Challenges',
      description: 'Notifications about new challenges and completions',
      icon: '🎯'
    },
    {
      key: 'communityUpdates',
      title: 'Community Updates',
      description: 'Stay connected with the recovery community',
      icon: '👥'
    },
    {
      key: 'healthBenefits',
      title: 'Health Benefits',
      description: 'Educational content about recovery benefits',
      icon: '🏥'
    },
    {
      key: 'financialUpdates',
      title: 'Financial Progress',
      description: 'Updates on money saved and financial milestones',
      icon: '💰'
    }
  ];

  return (
    <div className="space-y-6">
      {notificationSections.map((section) => {
        const sectionPrefs = preferences[section.key as keyof NotificationPreferences] as any;
        
        return (
          <div key={section.key} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{section.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {section.description}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={sectionPrefs?.enabled || false}
                  onChange={(e) => onUpdatePreference(
                    section.key as keyof NotificationPreferences,
                    'enabled',
                    e.target.checked
                  )}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Section-specific settings */}
            {sectionPrefs?.enabled && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Time setting for daily motivation and check-ins */}
                {(section.key === 'dailyMotivation' || section.key === 'checkInReminders') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notification Time
                    </label>
                    <input
                      type="time"
                      value={sectionPrefs.time || '09:00'}
                      onChange={(e) => onUpdatePreference(
                        section.key as keyof NotificationPreferences,
                        'time',
                        e.target.value
                      )}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    />
                  </div>
                )}

                {/* Frequency setting */}
                {section.key === 'dailyMotivation' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frequency
                    </label>
                    <select
                      value={sectionPrefs.frequency || 'daily'}
                      onChange={(e) => onUpdatePreference(
                        section.key as keyof NotificationPreferences,
                        'frequency',
                        e.target.value
                      )}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    >
                      <option value="daily">Daily</option>
                      <option value="every_other_day">Every other day</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                )}

                {/* Streak milestones */}
                {section.key === 'streakReminders' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Milestone Notifications
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={sectionPrefs.celebrateAchievements || false}
                          onChange={(e) => onUpdatePreference(
                            section.key as keyof NotificationPreferences,
                            'celebrateAchievements',
                            e.target.checked
                          )}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Celebrate major achievements
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Community preferences */}
                {section.key === 'communityUpdates' && (
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sectionPrefs.supportRequests || false}
                        onChange={(e) => onUpdatePreference(
                          section.key as keyof NotificationPreferences,
                          'supportRequests',
                          e.target.checked
                        )}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Support requests from community
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sectionPrefs.milestoneSharing || false}
                        onChange={(e) => onUpdatePreference(
                          section.key as keyof NotificationPreferences,
                          'milestoneSharing',
                          e.target.checked
                        )}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Community milestone celebrations
                      </span>
                    </label>
                  </div>
                )}

                {/* Challenge preferences */}
                {section.key === 'challengeNotifications' && (
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sectionPrefs.newChallenges || false}
                        onChange={(e) => onUpdatePreference(
                          section.key as keyof NotificationPreferences,
                          'newChallenges',
                          e.target.checked
                        )}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        New daily challenges
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sectionPrefs.completionReminders || false}
                        onChange={(e) => onUpdatePreference(
                          section.key as keyof NotificationPreferences,
                          'completionReminders',
                          e.target.checked
                        )}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Challenge completion reminders
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Schedule Tab Component
const ScheduleTab: React.FC<{
  preferences: NotificationPreferences;
  suggestedSchedules: any;
  onUpdatePreference: (section: keyof NotificationPreferences, key: string, value: any) => void;
}> = ({ preferences, suggestedSchedules, onUpdatePreference }) => {
  return (
    <div className="space-y-6">
      {/* Suggested Schedules */}
      {suggestedSchedules && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Suggested Schedules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedSchedules.schedules.map((schedule: any, index: number) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {schedule.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {schedule.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {schedule.times.length > 0 ? schedule.times.join(', ') : 'As needed'}
                  </span>
                  <button className="btn-secondary text-sm">
                    Apply Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimal Times */}
      {suggestedSchedules?.optimalTimes && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Optimal Notification Times
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                🌅 Morning ({suggestedSchedules.optimalTimes.morning.time})
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                {suggestedSchedules.optimalTimes.morning.purpose}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                {suggestedSchedules.optimalTimes.morning.effectiveness}
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                ☀️ Midday ({suggestedSchedules.optimalTimes.midday.time})
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                {suggestedSchedules.optimalTimes.midday.purpose}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {suggestedSchedules.optimalTimes.midday.effectiveness}
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                🌙 Evening ({suggestedSchedules.optimalTimes.evening.time})
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                {suggestedSchedules.optimalTimes.evening.purpose}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                {suggestedSchedules.optimalTimes.evening.effectiveness}
              </p>
            </div>
          </div>
          
          {/* Times to avoid */}
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
              ⚠️ Times to Avoid
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300">
              {suggestedSchedules.optimalTimes.avoid.times.join(', ')} - {suggestedSchedules.optimalTimes.avoid.reason}
            </p>
          </div>
        </div>
      )}

      {/* Personalization Tips */}
      {suggestedSchedules?.personalizationTips && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Personalization Tips
          </h3>
          <div className="space-y-3">
            {suggestedSchedules.personalizationTips.map((tip: string, index: number) => (
              <div key={index} className="flex items-start">
                <span className="text-blue-500 mr-3 mt-1">💡</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Content Tab Component
const ContentTab: React.FC<{
  preferencesData: NotificationPreferencesResponse;
  preferences: NotificationPreferences;
  onUpdatePreference: (section: keyof NotificationPreferences, key: string, value: any) => void;
}> = ({ preferencesData, preferences, onUpdatePreference }) => {
  const [motivationalContent, setMotivationalContent] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const content = await notificationService.getMotivationalContent(selectedCategory);
        setMotivationalContent(content);
      } catch (error) {
        console.error('Failed to fetch motivational content:', error);
      }
    };

    fetchContent();
  }, [selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Message Types */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Message Style Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {preferencesData.customizationOptions.messageTypes.map((type) => (
            <div key={type.key} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {type.label}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {notificationService.getMessageTypeDescription(type.key)}
              </p>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  // This would connect to user preferences for message types
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable this style
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Content Preview */}
      {motivationalContent && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Content Preview
            </h3>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="all">All Categories</option>
              {motivationalContent.categories.map((category: string) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {motivationalContent.content.slice(0, 6).map((content: any, index: number) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {content.content_type}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {content.category}
                  </span>
                </div>
                {content.title && (
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {content.title}
                  </h4>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {content.content}
                </p>
                {content.author && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    — {content.author}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Templates */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Custom Message Templates
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Create personalized notification messages that resonate with your recovery journey.
        </p>
        <button className="btn-primary">
          ➕ Create Custom Template
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferencesComponent;