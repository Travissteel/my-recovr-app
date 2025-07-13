import React, { useState, useEffect } from 'react';
import { ChallengesOverview, DailyChallenge, ChallengeCompletion } from '../../services/challengesService';
import { challengesService } from '../../services/challengesService';
import LoadingSpinner from '../LoadingSpinner';

interface DailyChallengesProps {
  className?: string;
  onChallengeComplete?: (challengeId: string, points: number) => void;
}

const DailyChallenges: React.FC<DailyChallengesProps> = ({ 
  className = '',
  onChallengeComplete 
}) => {
  const [challengesData, setChallengesData] = useState<ChallengesOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'today' | 'available' | 'history'>('today');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<DailyChallenge | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    const fetchChallengesData = async () => {
      try {
        const data = await challengesService.getChallengesOverview();
        setChallengesData(data);
      } catch (error) {
        console.error('Failed to fetch challenges data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallengesData();
  }, []);

  const handleCompleteChallenge = async (challenge: DailyChallenge, status: 'completed' | 'skipped') => {
    try {
      const completion: ChallengeCompletion = {
        challengeId: challenge.id,
        status,
        completionNotes: status === 'completed' ? completionNotes : undefined
      };

      await challengesService.completeChallenge(completion);
      
      // Update local state
      if (challengesData) {
        setChallengesData({
          ...challengesData,
          todaysChallenge: challengesData.todaysChallenge ? {
            ...challengesData.todaysChallenge,
            userProgress: {
              id: 'temp',
              challenge_id: challenge.id,
              challenge_date: new Date().toISOString().split('T')[0],
              status,
              points_earned: status === 'completed' ? challenge.points_reward : 0,
              completion_notes: completionNotes,
              created_at: new Date().toISOString()
            }
          } : undefined,
          statistics: {
            ...challengesData.statistics,
            totalCompleted: status === 'completed' ? challengesData.statistics.totalCompleted + 1 : challengesData.statistics.totalCompleted,
            totalPoints: status === 'completed' ? challengesData.statistics.totalPoints + challenge.points_reward : challengesData.statistics.totalPoints
          }
        });
      }

      if (status === 'completed' && onChallengeComplete) {
        onChallengeComplete(challenge.id, challenge.points_reward);
      }

      setShowCompletionModal(false);
      setCompletionNotes('');
      setSelectedChallenge(null);
    } catch (error) {
      console.error('Failed to complete challenge:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!challengesData) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">Failed to load challenges</p>
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
              Daily Challenges
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Complete challenges to earn points and build healthy habits
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {challengesData.statistics.totalPoints}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {challengesData.statistics.totalCompleted}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(challengesData.statistics.completionRate)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {challengesData.statistics.currentStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Current Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {challengesData.statistics.longestStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Best Streak</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'today', label: 'Today\'s Challenge', icon: '🎯' },
          { key: 'available', label: 'Available', icon: '📝' },
          { key: 'history', label: 'History', icon: '📚' }
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
      {selectedTab === 'today' && (
        <TodaysChallengeTab 
          todaysChallenge={challengesData.todaysChallenge}
          onCompleteChallenge={(challenge) => {
            setSelectedChallenge(challenge);
            setShowCompletionModal(true);
          }}
          onSkipChallenge={(challenge) => handleCompleteChallenge(challenge, 'skipped')}
        />
      )}

      {selectedTab === 'available' && (
        <AvailableChallengesTab 
          challenges={challengesData.availableChallenges}
          onSelectChallenge={(challenge) => {
            setSelectedChallenge(challenge);
            setShowCompletionModal(true);
          }}
        />
      )}

      {selectedTab === 'history' && (
        <ChallengeHistoryTab 
          recentCompletions={challengesData.recentCompletions}
        />
      )}

      {/* Completion Modal */}
      {showCompletionModal && selectedChallenge && (
        <ChallengeCompletionModal
          challenge={selectedChallenge}
          completionNotes={completionNotes}
          onNotesChange={setCompletionNotes}
          onComplete={() => handleCompleteChallenge(selectedChallenge, 'completed')}
          onSkip={() => handleCompleteChallenge(selectedChallenge, 'skipped')}
          onClose={() => {
            setShowCompletionModal(false);
            setSelectedChallenge(null);
            setCompletionNotes('');
          }}
        />
      )}
    </div>
  );
};

// Today's Challenge Tab
const TodaysChallengeTab: React.FC<{
  todaysChallenge?: ChallengesOverview['todaysChallenge'];
  onCompleteChallenge: (challenge: DailyChallenge) => void;
  onSkipChallenge: (challenge: DailyChallenge) => void;
}> = ({ todaysChallenge, onCompleteChallenge, onSkipChallenge }) => {
  if (!todaysChallenge) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Challenge Today
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Check back tomorrow for a new challenge!
        </p>
      </div>
    );
  }

  const { challenge, userProgress } = todaysChallenge;
  const isCompleted = userProgress?.status === 'completed';
  const isSkipped = userProgress?.status === 'skipped';

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start">
          <div className="text-4xl mr-4">
            {challengesService.getChallengeTypeIcon(challenge.challenge_type)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {challenge.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {challenge.description}
            </p>
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                challengesService.getDifficultyColor(challenge.difficulty_level)
              } bg-current bg-opacity-10`}>
                {challengesService.getDifficultyLabel(challenge.difficulty_level)}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                🏆 {challenge.points_reward} points
              </span>
            </div>
          </div>
        </div>
        
        {(isCompleted || isSkipped) && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            challengesService.getStatusColor(userProgress?.status || '')
          }`}>
            {isCompleted ? '✅ Completed' : '⏭️ Skipped'}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          Instructions:
        </h4>
        <ol className="list-decimal list-inside space-y-2">
          {challenge.instructions.map((instruction, index) => (
            <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
              {instruction}
            </li>
          ))}
        </ol>
      </div>

      {/* Completion Notes (if completed) */}
      {isCompleted && userProgress?.completion_notes && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            Your Completion Notes:
          </h4>
          <p className="text-sm text-green-700 dark:text-green-300">
            {userProgress.completion_notes}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {!isCompleted && !isSkipped && (
        <div className="flex space-x-3">
          <button
            onClick={() => onCompleteChallenge(challenge)}
            className="btn-primary flex-1"
          >
            Complete Challenge
          </button>
          <button
            onClick={() => onSkipChallenge(challenge)}
            className="btn-secondary"
          >
            Skip Today
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🎉</div>
          <p className="text-green-600 dark:text-green-400 font-medium">
            Great job! You earned {challenge.points_reward} points!
          </p>
        </div>
      )}
    </div>
  );
};

// Available Challenges Tab
const AvailableChallengesTab: React.FC<{
  challenges: DailyChallenge[];
  onSelectChallenge: (challenge: DailyChallenge) => void;
}> = ({ challenges, onSelectChallenge }) => {
  // Use sample challenges if none are provided
  const displayChallenges = challenges.length > 0 ? challenges : challengesService.getSampleChallenges();

  return (
    <div className="space-y-4">
      {displayChallenges.map((challenge) => (
        <div key={challenge.id} className="card hover:shadow-lg transition-shadow cursor-pointer"
             onClick={() => onSelectChallenge(challenge)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="text-3xl mr-4">
                {challengesService.getChallengeTypeIcon(challenge.challenge_type)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {challenge.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {challenge.description}
                </p>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    challengesService.getDifficultyColor(challenge.difficulty_level)
                  } bg-current bg-opacity-10`}>
                    {challengesService.getDifficultyLabel(challenge.difficulty_level)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {challenge.challenge_type}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-purple-600 dark:text-purple-400">
                +{challenge.points_reward}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">points</div>
            </div>
          </div>
        </div>
      ))}

      {displayChallenges.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Available Challenges
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            New challenges will appear here soon!
          </p>
        </div>
      )}
    </div>
  );
};

// Challenge History Tab
const ChallengeHistoryTab: React.FC<{
  recentCompletions: ChallengesOverview['recentCompletions'];
}> = ({ recentCompletions }) => {
  return (
    <div className="space-y-4">
      {recentCompletions.map((completion) => (
        <div key={completion.id} className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl mr-3">
                {completion.challenge_type ? 
                  challengesService.getChallengeTypeIcon(completion.challenge_type) : 
                  '🎯'
                }
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {completion.title || 'Challenge'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(completion.challenge_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                challengesService.getStatusColor(completion.status)
              }`}>
                {completion.status === 'completed' ? '✅ Completed' : 
                 completion.status === 'skipped' ? '⏭️ Skipped' : 
                 '🔄 In Progress'}
              </span>
              {completion.status === 'completed' && (
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  +{completion.points_earned}
                </span>
              )}
            </div>
          </div>
          
          {completion.completion_notes && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {completion.completion_notes}
              </p>
            </div>
          )}
        </div>
      ))}

      {recentCompletions.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No History Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Complete some challenges to see your history here!
          </p>
        </div>
      )}
    </div>
  );
};

// Challenge Completion Modal
const ChallengeCompletionModal: React.FC<{
  challenge: DailyChallenge;
  completionNotes: string;
  onNotesChange: (notes: string) => void;
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}> = ({ challenge, completionNotes, onNotesChange, onComplete, onSkip, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Complete Challenge
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-4">
            <span className="text-3xl mr-3">
              {challengesService.getChallengeTypeIcon(challenge.challenge_type)}
            </span>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {challenge.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Worth {challenge.points_reward} points
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How did it go? (optional)
            </label>
            <textarea
              value={completionNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Share your experience, insights, or how you felt..."
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button onClick={onSkip} className="btn-secondary flex-1">
            Skip Challenge
          </button>
          <button onClick={onComplete} className="btn-primary flex-1">
            Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyChallenges;