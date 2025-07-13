import React, { useState, useEffect } from 'react';
import { Achievement, ProgressData, ExtendedProgressData } from '../../services/gamificationService';
import { gamificationService } from '../../services/gamificationService';
import LoadingSpinner from '../LoadingSpinner';

interface GamificationDashboardProps {
  onAchievementClick?: (achievement: Achievement) => void;
  className?: string;
}

const GamificationDashboard: React.FC<GamificationDashboardProps> = ({
  onAchievementClick,
  className = ''
}) => {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [extendedData, setExtendedData] = useState<ExtendedProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'phases' | 'achievements' | 'leaderboard'>('overview');
  const [useExtended, setUseExtended] = useState(false);

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        const data = await gamificationService.getProgress();
        setProgressData(data);
        
        // Check if user has significant progress to show extended view
        const maxDays = Math.max(...data.programs.map(p => p.daysSinceStart), 0);
        if (maxDays >= 30) {
          setUseExtended(true);
          try {
            const extendedData = await gamificationService.getExtendedProgress();
            setExtendedData(extendedData);
          } catch (extendedError) {
            console.error('Failed to fetch extended data:', extendedError);
          }
        }
      } catch (error) {
        console.error('Failed to fetch progress data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">Failed to load progress data</p>
      </div>
    );
  }

  const { overallStats, achievements, programs, recentCheckIns } = progressData;
  const totalAchievementPoints = useExtended && extendedData 
    ? extendedData.achievements.totalPoints
    : achievements.reduce((sum, ach) => sum + (ach.pointsAwarded || 0), 0);
  const levelInfo = gamificationService.calculateLevel(totalAchievementPoints);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Level and XP */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {useExtended ? '365-Day Recovery Journey' : 'Recovery Progress'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {useExtended 
                ? 'Track your extended recovery journey with phase-based progression'
                : 'Track your journey and celebrate achievements'
              }
            </p>
            {useExtended && extendedData && (
              <div className="mt-2 text-sm">
                <span className="font-medium" style={{ color: extendedData.currentPhase.color }}>
                  {extendedData.currentPhase.icon} {extendedData.currentPhase.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  • {extendedData.motivationalMessage}
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              Level {levelInfo.level}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalAchievementPoints} XP
            </div>
            {useExtended && extendedData && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Phase {extendedData.phaseStatistics.currentPhaseDay} of {extendedData.currentPhase.duration || '∞'}
              </div>
            )}
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Progress to Level {levelInfo.level + 1}</span>
            <span className="font-medium">{Math.round(levelInfo.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallStats.totalDaysClean}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {overallStats.longestStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Best Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {achievements.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Achievements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {overallStats.checkInStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Check-in Streak</div>
          </div>
        </div>
      </div>

      {/* Progress Indicator for Extended View */}
      {useExtended && extendedData && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            365-Day Journey Progress
          </h3>
          <div className="space-y-4">
            {/* Overall Year Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Year Progress</span>
                <span className="font-medium">{Math.round(extendedData.yearlyProgress.percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${extendedData.yearlyProgress.percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {extendedData.yearlyProgress.daysCompleted} of 365 days completed
              </div>
            </div>

            {/* Current Phase Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {extendedData.currentPhase.name} Progress
                </span>
                <span className="font-medium">{Math.round(extendedData.currentPhase.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    backgroundColor: extendedData.currentPhase.color,
                    width: `${extendedData.currentPhase.progress}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          ...(useExtended ? [{ key: 'phases', label: 'Phases', icon: '🔄' }] : []),
          { key: 'achievements', label: 'Achievements', icon: '🏆' },
          { key: 'leaderboard', label: 'Leaderboard', icon: '👑' }
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Achievements */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Achievements
            </h3>
            <div className="space-y-3">
              {achievements.slice(0, 5).map((achievement, index) => (
                <div
                  key={achievement.key}
                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => onAchievementClick?.(achievement)}
                >
                  <div className="text-2xl mr-3">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {achievement.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {achievement.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{achievement.pointsAwarded || achievement.points} XP
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {achievement.earnedAt ? new Date(achievement.earnedAt).toLocaleDateString() : 'Available'}
                    </div>
                  </div>
                </div>
              ))}
              {achievements.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Complete your first challenge to earn achievements!
                </div>
              )}
            </div>
          </div>

          {/* Program Progress */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Program Progress
            </h3>
            <div className="space-y-4">
              {programs.map((program) => (
                <div key={program.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: program.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {program.addictionType}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {program.daysSinceStart} days
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Current Streak</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {program.currentStreak} days
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Best Streak</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {program.longestStreak} days
                    </span>
                  </div>

                  {/* Streak Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          backgroundColor: program.color,
                          width: `${Math.min((program.currentStreak / 90) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Progress to 90-day milestone
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'phases' && useExtended && extendedData && (
        <PhasesTab 
          extendedData={extendedData}
          onAchievementClick={onAchievementClick}
        />
      )}

      {selectedTab === 'achievements' && (
        <AchievementsTab 
          achievements={useExtended && extendedData ? extendedData.achievements.earned : achievements} 
          onAchievementClick={onAchievementClick}
          extendedData={extendedData}
        />
      )}

      {selectedTab === 'leaderboard' && (
        <LeaderboardTab />
      )}
    </div>
  );
};

// Phases Tab Component
const PhasesTab: React.FC<{
  extendedData: ExtendedProgressData;
  onAchievementClick?: (achievement: Achievement) => void;
}> = ({ extendedData, onAchievementClick }) => {
  const phases = ['foundation', 'reboot', 'stabilization', 'growth', 'mastery', 'mentor'];
  const currentPhaseIndex = phases.indexOf(extendedData.currentPhase.name);

  return (
    <div className="space-y-6">
      {/* Current Phase Highlight */}
      <div className="card" style={{ backgroundColor: `${extendedData.currentPhase.color}10` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-4xl mr-4">{extendedData.currentPhase.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {extendedData.currentPhase.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {extendedData.currentPhase.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: extendedData.currentPhase.color }}>
              {Math.round(extendedData.currentPhase.progress)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {extendedData.currentPhase.daysCompleted} of {extendedData.currentPhase.duration || '∞'} days
            </div>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Focus Areas</h4>
          <div className="flex flex-wrap gap-2">
            {extendedData.currentPhase.focus.map((focus, index) => (
              <span key={index} className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm">
                {focus}
              </span>
            ))}
          </div>
        </div>

        {/* Next Milestone */}
        {extendedData.nextMilestone && (
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{extendedData.nextMilestone.icon}</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {extendedData.nextMilestone.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {extendedData.nextMilestone.daysUntil} days remaining
                  </div>
                </div>
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{extendedData.nextMilestone.points} XP
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All Phases Timeline */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Recovery Journey Timeline
        </h3>
        <div className="space-y-4">
          {phases.map((phaseName, index) => {
            const isCompleted = index < currentPhaseIndex;
            const isCurrent = index === currentPhaseIndex;
            const isUpcoming = index > currentPhaseIndex;
            
            return (
              <div key={phaseName} className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                isCurrent 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : isCompleted
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                  isCurrent 
                    ? 'bg-blue-500 text-white'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {phaseName.charAt(0).toUpperCase() + phaseName.slice(1)} Phase
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Upcoming'}
                  </div>
                </div>
                {isCurrent && (
                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                    {Math.round(extendedData.currentPhase.progress)}% Complete
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase Achievements */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Phase Achievements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {extendedData.achievements.earned
            .filter(ach => ach.phase === extendedData.currentPhase.name)
            .map((achievement) => (
              <div
                key={achievement.key}
                className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg cursor-pointer hover:shadow-md transition-all"
                onClick={() => onAchievementClick?.(achievement)}
              >
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{achievement.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {achievement.name}
                    </div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400">
                      +{achievement.points} XP
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

// Achievements Tab Component
const AchievementsTab: React.FC<{
  achievements: Achievement[];
  onAchievementClick?: (achievement: Achievement) => void;
  extendedData?: ExtendedProgressData | null;
}> = ({ achievements, onAchievementClick, extendedData }) => {
  const [filter, setFilter] = useState<string>('all');
  
  const categories = extendedData 
    ? ['all', 'milestone', 'phase_completion', 'quarterly', 'extended', 'engagement', 'social', 'health', 'financial', 'mentoring']
    : ['all', 'milestone', 'engagement', 'social', 'health', 'financial'];
  const filteredAchievements = filter === 'all' 
    ? achievements 
    : achievements.filter(ach => ach.category === filter);

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === category
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.key}
            className={`card cursor-pointer transition-all hover:shadow-lg ${
              achievement.earnedAt 
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' 
                : 'border-gray-200 dark:border-gray-700 opacity-60'
            }`}
            onClick={() => onAchievementClick?.(achievement)}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{achievement.icon}</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {achievement.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {achievement.description}
              </p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                gamificationService.getAchievementCategoryColor(achievement.category)
              } bg-current bg-opacity-10`}>
                {achievement.points} XP
              </div>
              {achievement.earnedAt && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Leaderboard Tab Component
const LeaderboardTab: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState<'points' | 'streak'>('points');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await gamificationService.getLeaderboard('all_time', leaderboardType);
        setLeaderboardData(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [leaderboardType]);

  if (isLoading) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="space-y-6">
      {/* Type Toggle */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setLeaderboardType('points')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            leaderboardType === 'points'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          🏆 Points
        </button>
        <button
          onClick={() => setLeaderboardType('streak')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            leaderboardType === 'streak'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          🔥 Streaks
        </button>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div className="space-y-4">
          {leaderboardData?.leaderboard?.map((entry: any, index: number) => (
            <div
              key={entry.id}
              className={`flex items-center p-4 rounded-lg ${
                index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20' : 'bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 mr-4">
                {index < 3 ? (
                  <span className="text-lg">{['🥇', '🥈', '🥉'][index]}</span>
                ) : (
                  <span className="font-bold text-sm text-gray-600 dark:text-gray-400">
                    {entry.rank}
                  </span>
                )}
              </div>
              
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {entry.firstName || entry.username}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {leaderboardType === 'points' 
                    ? `${entry.totalPoints || 0} points • ${entry.achievementCount || 0} achievements`
                    : `${entry.longestCurrentStreak || 0} day current streak • ${entry.longestEverStreak || 0} best`
                  }
                </div>
              </div>

              {leaderboardData.userRank === entry.rank && (
                <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium">
                  You
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GamificationDashboard;