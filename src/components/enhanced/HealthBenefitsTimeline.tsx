import React, { useState, useEffect } from 'react';
import { HealthBenefitsResponse } from '../../services/gamificationService';
import { gamificationService } from '../../services/gamificationService';
import LoadingSpinner from '../LoadingSpinner';

interface HealthBenefitsTimelineProps {
  programId?: string;
  className?: string;
}

const HealthBenefitsTimeline: React.FC<HealthBenefitsTimelineProps> = ({ 
  programId, 
  className = '' 
}) => {
  const [healthData, setHealthData] = useState<HealthBenefitsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBenefit, setSelectedBenefit] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>(programId || '');

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        // Get user's programs first
        const progressData = await gamificationService.getProgress();
        setPrograms(progressData.programs);
        
        if (!selectedProgram && progressData.programs.length > 0) {
          setSelectedProgram(progressData.programs[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch programs:', error);
      }
    };

    fetchPrograms();
  }, [selectedProgram]);

  useEffect(() => {
    const fetchHealthBenefits = async () => {
      if (!selectedProgram) return;

      setIsLoading(true);
      try {
        const data = await gamificationService.getHealthBenefits(selectedProgram);
        setHealthData(data);
      } catch (error) {
        console.error('Failed to fetch health benefits:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealthBenefits();
  }, [selectedProgram]);

  if (programs.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">No active recovery programs found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">Failed to load health benefits data</p>
      </div>
    );
  }

  const { program, unlockedBenefits, upcomingBenefits } = healthData;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Health Benefits Timeline
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Track the science-backed health improvements in your recovery
            </p>
          </div>
          {programs.length > 1 && (
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.addictionType}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Program Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {program.daysSinceStart}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Days Clean</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {program.currentStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Current Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {unlockedBenefits.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Benefits Unlocked</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Recovery Timeline for {program.addictionType}
        </h3>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>

          <div className="space-y-8">
            {/* Unlocked Benefits */}
            {unlockedBenefits.map((benefit, index) => (
              <TimelineBenefit
                key={benefit.timeframe}
                benefit={benefit}
                isUnlocked={true}
                onClick={() => setSelectedBenefit(benefit)}
              />
            ))}

            {/* Current Position Marker */}
            <div className="relative flex items-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-full border-4 border-white dark:border-gray-800 shadow-lg z-10">
                <span className="text-xl">📍</span>
              </div>
              <div className="ml-6">
                <h4 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  You Are Here
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Day {program.daysSinceStart} of your recovery journey
                </p>
              </div>
            </div>

            {/* Upcoming Benefits */}
            {upcomingBenefits.map((benefit, index) => (
              <TimelineBenefit
                key={benefit.timeframe}
                benefit={benefit}
                isUnlocked={false}
                onClick={() => setSelectedBenefit(benefit)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Next Milestone */}
      {upcomingBenefits.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Next Milestone
          </h3>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {upcomingBenefits[0].title}
              </h4>
              <span className="text-2xl">{upcomingBenefits[0].icon}</span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  Days until unlock
                </span>
                <span className="font-medium">
                  {upcomingBenefits[0].daysUntilUnlock} days
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.max(5, (program.daysSinceStart / (upcomingBenefits[0].requiredDays || 1)) * 100)}%` 
                  }}
                />
              </div>
            </div>
            <ul className="space-y-1">
              {upcomingBenefits[0].benefits.slice(0, 2).map((benefit, index) => (
                <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                  <span className="text-blue-500 mr-2 mt-0.5">•</span>
                  {benefit}
                </li>
              ))}
            </ul>
            {upcomingBenefits[0].benefits.length > 2 && (
              <button
                onClick={() => setSelectedBenefit(upcomingBenefits[0])}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                See all benefits
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scientific Facts */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Science Behind Recovery
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              🧠 Neuroplasticity
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your brain literally rewires itself during recovery. New neural pathways form while 
              addiction pathways weaken with each day clean.
            </p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              ⚡ Dopamine Reset
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Dopamine receptors gradually return to normal sensitivity, helping you feel 
              pleasure from everyday activities again.
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
              💤 Sleep Restoration
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Sleep quality improves as your brain's natural sleep-wake cycles normalize, 
              leading to better recovery and mood.
            </p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
              🎯 Focus Enhancement
            </h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Cognitive function improves as brain fog lifts and concentration abilities 
              return to pre-addiction levels.
            </p>
          </div>
        </div>
      </div>

      {/* Benefit Detail Modal */}
      {selectedBenefit && (
        <BenefitDetailModal
          benefit={selectedBenefit}
          program={program}
          onClose={() => setSelectedBenefit(null)}
        />
      )}
    </div>
  );
};

// Timeline Benefit Component
const TimelineBenefit: React.FC<{
  benefit: any;
  isUnlocked: boolean;
  onClick: () => void;
}> = ({ benefit, isUnlocked, onClick }) => {
  return (
    <div 
      className={`relative flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -ml-2 transition-colors ${
        !isUnlocked ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      {/* Timeline Node */}
      <div className={`flex items-center justify-center w-16 h-16 rounded-full border-4 border-white dark:border-gray-800 shadow-lg z-10 ${
        isUnlocked 
          ? 'bg-green-500 text-white' 
          : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
      }`}>
        <span className="text-xl">{benefit.icon}</span>
      </div>

      {/* Content */}
      <div className="ml-6 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-lg font-semibold ${
            isUnlocked 
              ? 'text-green-800 dark:text-green-200' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {benefit.title}
          </h4>
          {!isUnlocked && benefit.daysUntilUnlock && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {benefit.daysUntilUnlock} days to go
            </span>
          )}
          {isUnlocked && benefit.unlockedAt && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Unlocked {new Date(benefit.unlockedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <ul className="space-y-1">
          {benefit.benefits.slice(0, 2).map((benefitText: string, index: number) => (
            <li key={index} className={`text-sm flex items-start ${
              isUnlocked 
                ? 'text-gray-700 dark:text-gray-300' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              <span className={`mr-2 mt-0.5 ${
                isUnlocked ? 'text-green-500' : 'text-gray-400'
              }`}>
                {isUnlocked ? '✓' : '○'}
              </span>
              {benefitText}
            </li>
          ))}
        </ul>

        {benefit.benefits.length > 2 && (
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2">
            +{benefit.benefits.length - 2} more benefits
          </button>
        )}
      </div>
    </div>
  );
};

// Benefit Detail Modal
const BenefitDetailModal: React.FC<{
  benefit: any;
  program: any;
  onClose: () => void;
}> = ({ benefit, program, onClose }) => {
  const isUnlocked = !benefit.daysUntilUnlock;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <span className="text-3xl mr-3">{benefit.icon}</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {benefit.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Status */}
        <div className={`p-4 rounded-lg mb-6 ${
          isUnlocked 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`font-medium ${
              isUnlocked 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {isUnlocked ? '✅ Unlocked!' : '🔒 Locked'}
            </span>
            {!isUnlocked && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {benefit.daysUntilUnlock} days remaining
              </span>
            )}
          </div>
          {!isUnlocked && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.max(5, (program.daysSinceStart / benefit.requiredDays) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Benefits List */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Health Benefits:
          </h4>
          <ul className="space-y-2">
            {benefit.benefits.map((benefitText: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className={`mr-3 mt-0.5 ${
                  isUnlocked ? 'text-green-500' : 'text-gray-400'
                }`}>
                  {isUnlocked ? '✓' : '○'}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {benefitText}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Timeline Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            📅 Timeline Information
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {isUnlocked 
              ? `You unlocked these benefits on day ${benefit.requiredDays} of your recovery journey.`
              : `These benefits will unlock after ${benefit.requiredDays} days of recovery. You're currently on day ${program.daysSinceStart}.`
            }
          </p>
          {benefit.category && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Category: {benefit.category}
            </p>
          )}
        </div>

        <div className="mt-6">
          <button onClick={onClose} className="btn-primary w-full">
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HealthBenefitsTimeline;