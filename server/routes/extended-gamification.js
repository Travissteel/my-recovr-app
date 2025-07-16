const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const SecurityAudit = require('../utils/securityAudit');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

/**
 * Extended 365-Day Gamification System
 * Building upon proven 90-day reboot programs with a full year journey
 */

// Enhanced Achievement System with 365-Day Program
const EXTENDED_ACHIEVEMENTS = {
  // Foundation Phase (Days 1-30) - Building Basic Habits
  'first_day': {
    name: 'First Day Strong',
    description: 'Completed your first day of recovery',
    icon: '🌅',
    points: 10,
    category: 'milestone',
    phase: 'foundation',
    daysRequired: 1
  },
  'three_days': {
    name: 'Early Momentum',
    description: 'Three days - withdrawal symptoms beginning to ease',
    icon: '💪',
    points: 25,
    category: 'milestone',
    phase: 'foundation',
    daysRequired: 3
  },
  'one_week': {
    name: 'Week Warrior',
    description: 'One week of progress - your brain is already changing!',
    icon: '🗓️',
    points: 50,
    category: 'milestone',
    phase: 'foundation',
    daysRequired: 7
  },
  'two_weeks': {
    name: 'Breakthrough',
    description: 'Two weeks - neuroplasticity is working in your favor',
    icon: '🧠',
    points: 100,
    category: 'milestone',
    phase: 'foundation',
    daysRequired: 14
  },
  'one_month': {
    name: 'Foundation Complete',
    description: 'One month - you\'ve built the foundation of recovery!',
    icon: '🏗️',
    points: 200,
    category: 'milestone',
    phase: 'foundation',
    daysRequired: 30
  },

  // Reboot Phase (Days 31-90) - Brain Rewiring
  'six_weeks': {
    name: 'Neural Rewiring',
    description: '6 weeks - major neural pathway changes occurring',
    icon: '🔄',
    points: 275,
    category: 'milestone',
    phase: 'reboot',
    daysRequired: 42
  },
  'two_months': {
    name: 'Reboot Progress',
    description: 'Two months - halfway to the complete reboot!',
    icon: '⚡',
    points: 350,
    category: 'milestone',
    phase: 'reboot',
    daysRequired: 60
  },
  'ninety_days': {
    name: 'Reboot Complete',
    description: '90 days - Complete brain reboot achieved! Brain fully rewired!',
    icon: '🎯',
    points: 500,
    category: 'milestone',
    phase: 'reboot',
    daysRequired: 90
  },

  // Stabilization Phase (Days 91-180) - Cementing Changes
  'four_months': {
    name: 'Stability Master',
    description: '4 months - recovery habits are now stable and strong',
    icon: '🗿',
    points: 650,
    category: 'milestone',
    phase: 'stabilization',
    daysRequired: 120
  },
  'five_months': {
    name: 'Resilience Builder',
    description: '5 months - building unshakeable resilience',
    icon: '🛡️',
    points: 750,
    category: 'milestone',
    phase: 'stabilization',
    daysRequired: 150
  },
  'six_months': {
    name: 'Half Year Champion',
    description: 'Six months - incredible transformation and strength!',
    icon: '⭐',
    points: 850,
    category: 'milestone',
    phase: 'stabilization',
    daysRequired: 180
  },

  // Growth Phase (Days 181-270) - Personal Development
  'seven_months': {
    name: 'Growth Seeker',
    description: '7 months - actively growing into your best self',
    icon: '🌱',
    points: 950,
    category: 'milestone',
    phase: 'growth',
    daysRequired: 210
  },
  'eight_months': {
    name: 'Life Architect',
    description: '8 months - designing and building your new life',
    icon: '🏗️',
    points: 1050,
    category: 'milestone',
    phase: 'growth',
    daysRequired: 240
  },
  'nine_months': {
    name: 'Purpose Finder',
    description: '9 months - discovering your deeper life purpose',
    icon: '🧭',
    points: 1150,
    category: 'milestone',
    phase: 'growth',
    daysRequired: 270
  },

  // Mastery Phase (Days 271-365) - Becoming a Role Model
  'ten_months': {
    name: 'Wisdom Keeper',
    description: '10 months - developing deep recovery wisdom',
    icon: '🦉',
    points: 1250,
    category: 'milestone',
    phase: 'mastery',
    daysRequired: 300
  },
  'eleven_months': {
    name: 'Legacy Builder',
    description: '11 months - ready to help others on their journey',
    icon: '🌟',
    points: 1350,
    category: 'milestone',
    phase: 'mastery',
    daysRequired: 330
  },
  'one_year': {
    name: 'Recovery Master',
    description: 'One full year - complete life transformation achieved!',
    icon: '👑',
    points: 1500,
    category: 'milestone',
    phase: 'mastery',
    daysRequired: 365
  },

  // Phase Completion Awards
  'phase_foundation_complete': {
    name: 'Foundation Graduate',
    description: 'Mastered the foundation phase (30 days)',
    icon: '🎓',
    points: 250,
    category: 'phase_completion',
    phase: 'foundation'
  },
  'phase_reboot_complete': {
    name: 'Reboot Graduate',
    description: 'Mastered the reboot phase (90 days)',
    icon: '🔄',
    points: 600,
    category: 'phase_completion',
    phase: 'reboot'
  },
  'phase_stabilization_complete': {
    name: 'Stabilization Graduate',
    description: 'Mastered the stabilization phase (180 days)',
    icon: '⚖️',
    points: 1000,
    category: 'phase_completion',
    phase: 'stabilization'
  },
  'phase_growth_complete': {
    name: 'Growth Graduate',
    description: 'Mastered the growth phase (270 days)',
    icon: '📈',
    points: 1400,
    category: 'phase_completion',
    phase: 'growth'
  },
  'phase_mastery_complete': {
    name: 'Mastery Graduate',
    description: 'Mastered the full 365-day program!',
    icon: '🏆',
    points: 2000,
    category: 'phase_completion',
    phase: 'mastery'
  },

  // Extended Journey (Beyond 365 days)
  'fifteen_months': {
    name: 'Mentor Candidate',
    description: '15 months - qualified to mentor newcomers',
    icon: '👨‍🏫',
    points: 1750,
    category: 'extended',
    phase: 'mentor',
    daysRequired: 450
  },
  'eighteen_months': {
    name: 'Recovery Veteran',
    description: '18 months - a true veteran of transformation',
    icon: '🎖️',
    points: 2000,
    category: 'extended',
    phase: 'mentor',
    daysRequired: 540
  },
  'two_years': {
    name: 'Life Transformer',
    description: 'Two years - living proof that change is possible',
    icon: '🦋',
    points: 2500,
    category: 'extended',
    phase: 'mentor',
    daysRequired: 730
  },

  // Quarterly Achievements
  'q1_complete': {
    name: 'Q1 Champion',
    description: 'Completed your first quarter of recovery',
    icon: '🥇',
    points: 400,
    category: 'quarterly',
    phase: 'foundation'
  },
  'q2_complete': {
    name: 'Q2 Champion',
    description: 'Completed second quarter with strength',
    icon: '🥈',
    points: 600,
    category: 'quarterly',
    phase: 'reboot'
  },
  'q3_complete': {
    name: 'Q3 Champion',
    description: 'Completed third quarter with wisdom',
    icon: '🥉',
    points: 800,
    category: 'quarterly',
    phase: 'stabilization'
  },
  'q4_complete': {
    name: 'Q4 Champion',
    description: 'Completed the full year journey!',
    icon: '🏆',
    points: 1000,
    category: 'quarterly',
    phase: 'mastery'
  },

  // Advanced Engagement Achievements
  'mentor_first_help': {
    name: 'First Mentor Moment',
    description: 'Helped your first newcomer in recovery',
    icon: '🤝',
    points: 200,
    category: 'mentoring',
    phase: 'mentor'
  },
  'calendar_perfectionist': {
    name: 'Calendar Master',
    description: 'Logged mood for 100 consecutive days',
    icon: '📅',
    points: 300,
    category: 'engagement',
    phase: 'any'
  },
  'challenge_specialist': {
    name: 'Challenge Specialist',
    description: 'Completed 50 daily challenges',
    icon: '🎯',
    points: 250,
    category: 'engagement',
    phase: 'any'
  },
  'financial_tracker': {
    name: 'Financial Warrior',
    description: 'Saved over $1000 through recovery',
    icon: '💰',
    points: 300,
    category: 'financial',
    phase: 'any'
  },
  'community_leader': {
    name: 'Community Leader',
    description: 'Helped 10+ community members',
    icon: '👥',
    points: 400,
    category: 'social',
    phase: 'any'
  }
};

// Recovery Phase Definitions
const RECOVERY_PHASES = {
  foundation: {
    name: 'Foundation Phase',
    description: 'Building the basic habits and neural pathways for recovery',
    duration: 30,
    color: '#10B981', // Green
    icon: '🌱',
    focus: ['Habit formation', 'Basic coping skills', 'Support system building'],
    challenges: ['Daily check-ins', 'Basic mindfulness', 'Trigger identification']
  },
  reboot: {
    name: 'Reboot Phase',
    description: 'Major brain rewiring and neural pathway reconstruction',
    duration: 60, // Days 31-90
    color: '#3B82F6', // Blue
    icon: '🔄',
    focus: ['Neural rewiring', 'Advanced coping', 'Lifestyle changes'],
    challenges: ['Meditation practice', 'Physical exercise', 'Social connection']
  },
  stabilization: {
    name: 'Stabilization Phase',
    description: 'Cementing changes and building unshakeable resilience',
    duration: 90, // Days 91-180
    color: '#8B5CF6', // Purple
    icon: '⚖️',
    focus: ['Habit reinforcement', 'Resilience building', 'Identity transformation'],
    challenges: ['Advanced challenges', 'Helping others', 'Goal setting']
  },
  growth: {
    name: 'Growth Phase',
    description: 'Personal development and life purpose discovery',
    duration: 90, // Days 181-270
    color: '#F59E0B', // Orange
    icon: '📈',
    focus: ['Personal growth', 'Purpose discovery', 'Skill development'],
    challenges: ['Creative projects', 'Learning new skills', 'Leadership roles']
  },
  mastery: {
    name: 'Mastery Phase',
    description: 'Becoming a role model and master of your recovery',
    duration: 95, // Days 271-365
    color: '#EF4444', // Red
    icon: '👑',
    focus: ['Mastery achievement', 'Mentoring others', 'Legacy building'],
    challenges: ['Mentor challenges', 'Advanced wellness', 'Community leadership']
  },
  mentor: {
    name: 'Mentor Phase',
    description: 'Supporting others and continuing your own growth',
    duration: null, // Ongoing
    color: '#6366F1', // Indigo
    icon: '👨‍🏫',
    focus: ['Mentoring newcomers', 'Continuous growth', 'Community leadership'],
    challenges: ['Mentor duties', 'Advanced practices', 'Legacy projects']
  }
};

// Get user's current phase based on days clean
router.getCurrentPhase = function(daysClean) {
  if (daysClean <= 30) return 'foundation';
  if (daysClean <= 90) return 'reboot';
  if (daysClean <= 180) return 'stabilization';
  if (daysClean <= 270) return 'growth';
  if (daysClean <= 365) return 'mastery';
  return 'mentor';
};

// Get phase progress percentage
router.getPhaseProgress = function(daysClean) {
  const phase = this.getCurrentPhase(daysClean);
  const phaseInfo = RECOVERY_PHASES[phase];
  
  if (phase === 'mentor') return 100;
  
  let phaseStartDay = 0;
  if (phase === 'reboot') phaseStartDay = 30;
  else if (phase === 'stabilization') phaseStartDay = 90;
  else if (phase === 'growth') phaseStartDay = 180;
  else if (phase === 'mastery') phaseStartDay = 270;
  
  const daysIntoPhase = daysClean - phaseStartDay;
  return Math.min((daysIntoPhase / phaseInfo.duration) * 100, 100);
};

// Get extended user progress with phase information
router.get('/extended-progress', authenticateToken, async (req, res) => {
  try {
    // Get user's recovery programs
    const programsQuery = `
      SELECT rp.*, at.name as addiction_type, at.color,
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400 AS days_since_start,
             rp.current_streak, rp.longest_streak
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.user_id = $1 AND rp.status = 'active'
      ORDER BY rp.created_at DESC
    `;

    const programs = await pool.query(programsQuery, [req.user.id]);

    // Calculate overall progress
    const maxDays = programs.rows.reduce((max, program) => 
      Math.max(max, Math.floor(program.days_since_start)), 0
    );

    const currentPhase = this.getCurrentPhase(maxDays);
    const phaseProgress = this.getPhaseProgress(maxDays);
    const phaseInfo = RECOVERY_PHASES[currentPhase];

    // Get achievements for this user
    const achievementsQuery = `
      SELECT achievement_key, earned_at, points_awarded
      FROM user_achievements 
      WHERE user_id = $1 
      ORDER BY earned_at DESC
    `;
    const userAchievements = await pool.query(achievementsQuery, [req.user.id]);

    // Calculate which achievements are available but not earned
    const earnedKeys = userAchievements.rows.map(a => a.achievement_key);
    const availableAchievements = Object.entries(EXTENDED_ACHIEVEMENTS)
      .filter(([key, achievement]) => {
        if (earnedKeys.includes(key)) return false;
        if (achievement.daysRequired && maxDays >= achievement.daysRequired) return true;
        return false;
      })
      .map(([key, achievement]) => ({ key, ...achievement }));

    // Get next major milestone
    const nextMilestone = Object.entries(EXTENDED_ACHIEVEMENTS)
      .filter(([key, achievement]) => {
        return achievement.category === 'milestone' && 
               achievement.daysRequired && 
               achievement.daysRequired > maxDays;
      })
      .sort((a, b) => a[1].daysRequired - b[1].daysRequired)[0];

    // Calculate yearly progress metrics
    const yearProgress = Math.min((maxDays / 365) * 100, 100);
    const nextPhase = this.getNextPhase(currentPhase);

    const response = {
      currentPhase: {
        ...phaseInfo,
        name: currentPhase,
        progress: phaseProgress,
        daysCompleted: maxDays,
        daysRemaining: phaseInfo.duration ? Math.max(0, phaseInfo.duration - (maxDays % phaseInfo.duration)) : 0
      },
      nextPhase: nextPhase ? RECOVERY_PHASES[nextPhase] : null,
      yearlyProgress: {
        percentage: yearProgress,
        daysCompleted: maxDays,
        daysRemaining: Math.max(0, 365 - maxDays),
        isComplete: maxDays >= 365
      },
      nextMilestone: nextMilestone ? {
        key: nextMilestone[0],
        ...nextMilestone[1],
        daysUntil: nextMilestone[1].daysRequired - maxDays
      } : null,
      programs: programs.rows.map(program => ({
        id: program.id,
        addictionType: program.addiction_type,
        color: program.color,
        currentStreak: program.current_streak,
        longestStreak: program.longest_streak,
        daysSinceStart: Math.floor(program.days_since_start),
        startDate: program.start_date,
        phase: this.getCurrentPhase(Math.floor(program.days_since_start))
      })),
      achievements: {
        earned: userAchievements.rows.map(achievement => ({
          ...EXTENDED_ACHIEVEMENTS[achievement.achievement_key],
          key: achievement.achievement_key,
          earnedAt: achievement.earned_at,
          pointsAwarded: achievement.points_awarded
        })),
        available: availableAchievements,
        totalPoints: userAchievements.rows.reduce((sum, a) => sum + a.points_awarded, 0)
      },
      phaseStatistics: this.calculatePhaseStatistics(maxDays),
      motivationalMessage: this.getMotivationalMessage(currentPhase, maxDays)
    };

    res.json(response);

  } catch (error) {
    console.error('Extended progress error:', error);
    res.status(500).json({ error: 'Failed to fetch extended progress data' });
  }
});

// Get detailed phase information
router.get('/phases/:phaseName', authenticateToken, async (req, res) => {
  try {
    const { phaseName } = req.params;
    const phaseInfo = RECOVERY_PHASES[phaseName];

    if (!phaseInfo) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Get achievements for this phase
    const phaseAchievements = Object.entries(EXTENDED_ACHIEVEMENTS)
      .filter(([key, achievement]) => achievement.phase === phaseName)
      .map(([key, achievement]) => ({ key, ...achievement }));

    // Get phase-specific challenges (would be implemented based on your challenge system)
    const phaseChallenges = await this.getPhaseSpecificChallenges(phaseName);

    // Get user's progress in this phase
    const userProgress = await this.getUserPhaseProgress(req.user.id, phaseName);

    res.json({
      phase: phaseInfo,
      achievements: phaseAchievements,
      challenges: phaseChallenges,
      userProgress: userProgress,
      tips: this.getPhaseSpecificTips(phaseName),
      focusAreas: phaseInfo.focus,
      estimatedDuration: phaseInfo.duration,
      nextPhase: this.getNextPhase(phaseName)
    });

  } catch (error) {
    console.error('Get phase info error:', error);
    res.status(500).json({ error: 'Failed to fetch phase information' });
  }
});

// Helper methods
router.getNextPhase = function(currentPhase) {
  const phases = ['foundation', 'reboot', 'stabilization', 'growth', 'mastery', 'mentor'];
  const currentIndex = phases.indexOf(currentPhase);
  return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
};

router.calculatePhaseStatistics = function(daysClean) {
  const stats = {
    phasesCompleted: 0,
    currentPhaseDay: 0,
    overallProgress: Math.min((daysClean / 365) * 100, 100)
  };

  if (daysClean >= 30) stats.phasesCompleted++;
  if (daysClean >= 90) stats.phasesCompleted++;
  if (daysClean >= 180) stats.phasesCompleted++;
  if (daysClean >= 270) stats.phasesCompleted++;
  if (daysClean >= 365) stats.phasesCompleted++;

  // Calculate current phase day
  if (daysClean <= 30) stats.currentPhaseDay = daysClean;
  else if (daysClean <= 90) stats.currentPhaseDay = daysClean - 30;
  else if (daysClean <= 180) stats.currentPhaseDay = daysClean - 90;
  else if (daysClean <= 270) stats.currentPhaseDay = daysClean - 180;
  else if (daysClean <= 365) stats.currentPhaseDay = daysClean - 270;
  else stats.currentPhaseDay = daysClean - 365;

  return stats;
};

router.getMotivationalMessage = function(phase, daysClean) {
  const messages = {
    foundation: [
      `Day ${daysClean} - You're building the foundation of your new life!`,
      'Every day in the foundation phase is crucial - you\'re doing amazing!',
      'Your brain is already starting to heal and rewire itself!'
    ],
    reboot: [
      `Day ${daysClean} - Major brain rewiring happening right now!`,
      'The reboot phase is where the magic happens - keep going!',
      'Your neural pathways are transforming with each passing day!'
    ],
    stabilization: [
      `Day ${daysClean} - Your recovery is becoming unshakeable!`,
      'In the stabilization phase, you\'re cementing lasting change!',
      'Your resilience is growing stronger every single day!'
    ],
    growth: [
      `Day ${daysClean} - You\'re growing into your best self!`,
      'The growth phase is about discovering your true potential!',
      'You\'re not just recovering - you\'re transforming!'
    ],
    mastery: [
      `Day ${daysClean} - You\'re mastering the art of recovery!`,
      'In the mastery phase, you\'re becoming an inspiration to others!',
      'You\'re proving that complete transformation is possible!'
    ],
    mentor: [
      `Day ${daysClean} - You\'re now a beacon of hope for others!`,
      'As a mentor, your journey inspires countless others!',
      'Your success story is changing lives beyond your own!'
    ]
  };

  const phaseMessages = messages[phase] || messages.foundation;
  return phaseMessages[Math.floor(Math.random() * phaseMessages.length)];
};

router.getPhaseSpecificTips = function(phase) {
  const tips = {
    foundation: [
      'Focus on building consistent daily habits',
      'Don\'t worry about perfection - consistency is key',
      'Use the community for support during difficult moments',
      'Track your mood daily to identify patterns'
    ],
    reboot: [
      'This is when major brain changes happen - trust the process',
      'Increase physical activity to support neuroplasticity',
      'Practice advanced mindfulness and meditation',
      'Start helping newcomers to reinforce your own recovery'
    ],
    stabilization: [
      'Build resilience through challenge completion',
      'Develop a strong support network',
      'Focus on identity transformation',
      'Set meaningful long-term goals'
    ],
    growth: [
      'Explore new interests and passions',
      'Take on leadership roles in the community',
      'Invest in personal and professional development',
      'Create a vision for your future'
    ],
    mastery: [
      'Share your story to inspire others',
      'Take on mentor responsibilities',
      'Focus on giving back to the community',
      'Build a lasting legacy of recovery'
    ],
    mentor: [
      'Continue your own growth while helping others',
      'Stay humble and remember your own journey',
      'Model the behavior you want to see',
      'Celebrate the success of those you mentor'
    ]
  };

  return tips[phase] || tips.foundation;
};

router.getPhaseSpecificChallenges = async function(phase) {
  // This would integrate with your existing challenge system
  // Return phase-appropriate challenges
  return [];
};

router.getUserPhaseProgress = async function(userId, phase) {
  // Calculate user's specific progress within a phase
  return {
    completed: false,
    progressPercentage: 0,
    achievementsEarned: 0,
    challengesCompleted: 0
  };
};

module.exports = router;