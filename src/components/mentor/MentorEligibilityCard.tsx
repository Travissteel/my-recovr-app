import React, { useState, useEffect } from 'react';
import { mentorService, MentorEligibility } from '../../services/mentorService';
import LoadingSpinner from '../LoadingSpinner';

interface MentorEligibilityCardProps {
  onApplicationClick?: () => void;
  onDashboardClick?: () => void;
  className?: string;
}

const MentorEligibilityCard: React.FC<MentorEligibilityCardProps> = ({
  onApplicationClick,
  onDashboardClick,
  className = ''
}) => {
  const [eligibility, setEligibility] = useState<MentorEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEligibility = async () => {
      try {
        const data = await mentorService.checkEligibility();
        setEligibility(data);
      } catch (error) {
        console.error('Failed to fetch mentor eligibility:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEligibility();
  }, []);

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex justify-center items-center h-32">
          <LoadingSpinner size="medium" />
        </div>
      </div>
    );
  }

  if (!eligibility) {
    return null;
  }

  if (eligibility.isCurrentMentor) {
    return (
      <div className={`card bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-3xl mr-3">👨‍🏫</span>
            <div>
              <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200">
                Active Mentor
              </h3>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                You're helping others on their recovery journey
              </p>
            </div>
          </div>
          {eligibility.mentorInfo && (
            <div className="flex flex-col items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                mentorService.getSubscriptionBadgeColor(eligibility.mentorInfo.subscriptionType || 'free')
              }`}>
                {eligibility.mentorInfo.isLifetime ? '🏆 Lifetime Member' : 
                 eligibility.mentorInfo.subscriptionType?.toUpperCase() || 'FREE'}
              </span>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {eligibility.mentorInfo.statistics.totalPoints} points
              </div>
            </div>
          )}
        </div>

        {/* Mentor Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
              {eligibility.mentorInfo?.statistics.activeMentees || 0}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Active Mentees</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
              {eligibility.mentorInfo?.statistics.thisMonthActivities || 0}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">This Month</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
              {eligibility.mentorInfo?.statistics.totalActivities || 0}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Total Activities</div>
          </div>
        </div>

        {/* Free Access Status */}
        <FreeAccessStatusBanner eligibility={eligibility} />

        <button
          onClick={onDashboardClick}
          className="w-full mt-4 btn-primary bg-purple-600 hover:bg-purple-700"
        >
          Open Mentor Dashboard
        </button>
      </div>
    );
  }

  if (eligibility.isEligible) {
    return (
      <div className={`card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 ${className}`}>
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">🎓</span>
          <div>
            <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
              Mentor Program Eligible!
            </h3>
            <p className="text-sm text-green-600 dark:text-green-300">
              You qualify to become a mentor and help others
            </p>
          </div>
        </div>

        {/* Benefits Preview */}
        <div className="mb-4">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            🎁 Mentor Benefits:
          </h4>
          <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Free premium access for 1 year while mentoring</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Lifetime free membership after 2 years</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Exclusive mentor badges and recognition</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Advanced analytics and insights</span>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            📋 Requirements for Free Access:
          </h4>
          <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <div>• {eligibility.requirements.minMentees}+ active mentees</div>
            <div>• {eligibility.requirements.minMonthlyActivities}+ monthly engagement activities</div>
            <div>• Consistent community participation</div>
          </div>
        </div>

        <button
          onClick={onApplicationClick}
          className="w-full btn-primary bg-green-600 hover:bg-green-700"
        >
          Apply to Become a Mentor
        </button>
      </div>
    );
  }

  return (
    <div className={`card bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center mb-4">
        <span className="text-3xl mr-3">🌱</span>
        <div>
          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">
            Mentor Program
          </h3>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            Help others while earning free premium access
          </p>
        </div>
      </div>

      {/* Progress to Eligibility */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-blue-600 dark:text-blue-400">Progress to Eligibility</span>
          <span className="font-medium text-blue-800 dark:text-blue-200">
            {eligibility.currentDaysClean} / {eligibility.requiredDays} days
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-3 dark:bg-blue-800">
          <div 
            className="bg-gradient-to-r from-blue-400 to-cyan-500 h-3 rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.min((eligibility.currentDaysClean / eligibility.requiredDays) * 100, 100)}%` 
            }}
          />
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          {eligibility.daysUntilEligible} days remaining
        </div>
      </div>

      {/* What You'll Get */}
      <div className="space-y-2">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200">
          🎯 When You Qualify:
        </h4>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <div className="flex items-center">
            <span className="text-blue-500 mr-2">🎁</span>
            <span>1 year free premium while mentoring</span>
          </div>
          <div className="flex items-center">
            <span className="text-blue-500 mr-2">♾️</span>
            <span>Lifetime membership after 2 years</span>
          </div>
          <div className="flex items-center">
            <span className="text-blue-500 mr-2">👥</span>
            <span>Help newcomers in their journey</span>
          </div>
          <div className="flex items-center">
            <span className="text-blue-500 mr-2">🏆</span>
            <span>Exclusive mentor recognition</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Free Access Status Banner Component
const FreeAccessStatusBanner: React.FC<{ eligibility: MentorEligibility }> = ({ eligibility }) => {
  const mentorInfo = eligibility.mentorInfo;
  if (!mentorInfo) return null;

  if (mentorInfo.isLifetime) {
    return (
      <div className="p-3 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🏆</span>
          <div>
            <div className="font-bold text-purple-800 dark:text-purple-200">
              Lifetime Member
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              Thank you for 2+ years of dedicated mentoring!
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = mentorInfo.statistics;
  const hasEnoughMentees = stats.activeMentees >= eligibility.requirements.minMentees;
  const hasEnoughActivity = stats.thisMonthActivities >= eligibility.requirements.minMonthlyActivities;
  
  if (hasEnoughMentees && hasEnoughActivity) {
    return (
      <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🎁</span>
            <div>
              <div className="font-bold text-green-800 dark:text-green-200">
                Free Premium Access Active
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Keep mentoring to maintain benefits
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-green-600 dark:text-green-400">
              Expires: {mentorInfo.expiresAt ? new Date(mentorInfo.expiresAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
      <div className="flex items-center">
        <span className="text-2xl mr-2">⚠️</span>
        <div>
          <div className="font-bold text-yellow-800 dark:text-yellow-200">
            Maintain Activity for Free Access
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1 mt-1">
            <div>Mentees: {stats.activeMentees}/{eligibility.requirements.minMentees} 
              {!hasEnoughMentees && <span className="text-red-500"> ⚠️</span>}
            </div>
            <div>Activity: {stats.thisMonthActivities}/{eligibility.requirements.minMonthlyActivities}
              {!hasEnoughActivity && <span className="text-red-500"> ⚠️</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorEligibilityCard;