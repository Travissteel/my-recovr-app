const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const SecurityAudit = require('../utils/securityAudit');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

/**
 * Gamification and Progress Tracking Routes
 * Inspired by proven psychology-based approaches to addiction recovery
 */

// Achievement system inspired by proven milestone approaches
const ACHIEVEMENTS = {
  // Time-based milestones for effective streak tracking
  'first_day': {
    name: 'First Day Strong',
    description: 'Completed your first day of recovery',
    icon: '🌅',
    points: 10,
    category: 'milestone'
  },
  'one_week': {
    name: 'Week Warrior',
    description: 'One week of progress - your brain is already changing!',
    icon: '🗓️',
    points: 50,
    category: 'milestone'
  },
  'two_weeks': {
    name: 'Breakthrough',
    description: 'Two weeks - neuroplasticity is working in your favor',
    icon: '🧠',
    points: 100,
    category: 'milestone'
  },
  'one_month': {
    name: 'Monthly Champion',
    description: 'One month of recovery - significant brain rewiring happening',
    icon: '🏆',
    points: 200,
    category: 'milestone'
  },
  'ninety_days': {
    name: 'Reboot Complete',
    description: '90 days - Complete brain reboot achieved!',
    icon: '🎯',
    points: 500,
    category: 'milestone'
  },
  'six_months': {
    name: 'Half Year Hero',
    description: 'Six months of sustained recovery',
    icon: '⭐',
    points: 750,
    category: 'milestone'
  },
  'one_year': {
    name: 'Annual Achievement',
    description: 'One full year - you\'ve transformed your life!',
    icon: '👑',
    points: 1000,
    category: 'milestone'
  },

  // Engagement achievements for consistent daily practice
  'daily_checkin_streak_7': {
    name: 'Check-in Champion',
    description: 'Completed daily check-ins for 7 days straight',
    icon: '✅',
    points: 30,
    category: 'engagement'
  },
  'journal_entries_10': {
    name: 'Reflective Writer',
    description: 'Completed 10 journal entries',
    icon: '📝',
    points: 40,
    category: 'engagement'
  },
  'community_supporter': {
    name: 'Community Support',
    description: 'Helped 5 community members with encouragement',
    icon: '🤝',
    points: 60,
    category: 'social'
  },
  'crisis_overcome': {
    name: 'Crisis Navigator',
    description: 'Successfully used crisis tools to overcome a difficult moment',
    icon: '🛡️',
    points: 100,
    category: 'resilience'
  },

  // Health and wellness tracking for comprehensive recovery
  'health_improvements': {
    name: 'Wellness Warrior',
    description: 'Documented health improvements in 3 categories',
    icon: '💪',
    points: 80,
    category: 'health'
  },
  'money_saved_100': {
    name: 'Smart Saver',
    description: 'Saved $100 through recovery',
    icon: '💰',
    points: 50,
    category: 'financial'
  },
  'goal_setter': {
    name: 'Goal Achiever',
    description: 'Set and achieved 3 recovery goals',
    icon: '🎯',
    points: 70,
    category: 'growth'
  }
};

// Health benefits timeline based on scientific research
const HEALTH_BENEFITS = {
  '1_day': {
    title: 'Day 1: The Journey Begins',
    benefits: [
      'Dopamine receptors begin to stabilize',
      'Motivation to change is at its peak',
      'First step toward neuroplasticity'
    ],
    icon: '🌱',
    category: 'neurological'
  },
  '3_days': {
    title: 'Day 3: Early Withdrawal',
    benefits: [
      'Brain starts reducing addictive pathways',
      'Sleep patterns may be disrupted but improving',
      'Increased awareness of triggers'
    ],
    icon: '🧩',
    category: 'neurological'
  },
  '1_week': {
    title: 'Week 1: Neural Rewiring Begins',
    benefits: [
      'Significant reduction in cravings',
      'Improved focus and concentration',
      'Better emotional regulation'
    ],
    icon: '🧠',
    category: 'neurological'
  },
  '2_weeks': {
    title: 'Week 2: Momentum Building',
    benefits: [
      'Enhanced mood stability',
      'Improved social interactions',
      'Increased energy levels'
    ],
    icon: '⚡',
    category: 'psychological'
  },
  '1_month': {
    title: 'Month 1: Major Milestone',
    benefits: [
      'Significant brain restructuring',
      'Improved sleep quality',
      'Enhanced self-confidence',
      'Better relationship with others'
    ],
    icon: '🏆',
    category: 'comprehensive'
  },
  '3_months': {
    title: 'Month 3: The 90-Day Reboot',
    benefits: [
      'Complete neurological reboot achieved',
      'Normalized dopamine sensitivity',
      'Significantly improved quality of life',
      'Stronger resilience to triggers'
    ],
    icon: '🎯',
    category: 'comprehensive'
  },
  '6_months': {
    title: 'Month 6: Transformed Life',
    benefits: [
      'Sustained positive brain changes',
      'Improved physical health markers',
      'Enhanced relationships and social connections',
      'Increased life satisfaction'
    ],
    icon: '⭐',
    category: 'comprehensive'
  },
  '1_year': {
    title: 'Year 1: Complete Transformation',
    benefits: [
      'Full neuroplasticity benefits realized',
      'Optimal brain function restored',
      'Strong recovery identity established',
      'Ability to help others in their journey'
    ],
    icon: '👑',
    category: 'comprehensive'
  },
  
  // Extended benefits beyond 365 days
  '15_months': {
    title: 'Month 15: Mentor Phase',
    benefits: [
      'Qualified to mentor newcomers',
      'Deep wisdom and perspective gained',
      'Strong relapse prevention skills',
      'Inspiring example for others'
    ],
    icon: '👨‍🏫',
    category: 'mentorship'
  },
  '18_months': {
    title: 'Month 18: Recovery Veteran',
    benefits: [
      'Veteran status in recovery community',
      'Advanced coping mechanisms mastered',
      'Life purpose clearly defined',
      'Sustained high quality of life'
    ],
    icon: '🎖️',
    category: 'mastery'
  },
  '2_years': {
    title: 'Year 2: Life Transformer',
    benefits: [
      'Living proof of complete transformation',
      'Inspiring countless others',
      'Master of personal growth',
      'Legacy of positive impact'
    ],
    icon: '🦋',
    category: 'legacy'
  }
};

// Get user's current streak and progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    // Get user's active recovery programs
    const programsQuery = `
      SELECT rp.*, at.name as addiction_type, at.color,
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400 AS days_since_start,
             rp.current_streak,
             rp.longest_streak
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.user_id = $1 AND rp.status = 'active'
      ORDER BY rp.created_at DESC
    `;

    const programs = await pool.query(programsQuery, [req.user.id]);

    // Get recent check-ins for mood tracking
    const checkinsQuery = `
      SELECT checkin_date, mood_rating, energy_level, craving_intensity,
             trigger_notes, gratitude_notes
      FROM daily_checkins 
      WHERE user_id = $1 
      ORDER BY checkin_date DESC 
      LIMIT 30
    `;

    const checkins = await pool.query(checkinsQuery, [req.user.id]);

    // Calculate overall statistics
    const totalDaysClean = programs.rows.reduce((sum, program) => 
      sum + Math.floor(program.days_since_start), 0
    );

    const longestStreak = programs.rows.reduce((max, program) => 
      Math.max(max, program.longest_streak || 0), 0
    );

    // Get user achievements
    const achievementsQuery = `
      SELECT achievement_key, earned_at, points_awarded
      FROM user_achievements 
      WHERE user_id = $1 
      ORDER BY earned_at DESC
    `;

    const userAchievements = await pool.query(achievementsQuery, [req.user.id]);

    const response = {
      programs: programs.rows.map(program => ({
        id: program.id,
        addictionType: program.addiction_type,
        color: program.color,
        currentStreak: program.current_streak,
        longestStreak: program.longest_streak,
        daysSinceStart: Math.floor(program.days_since_start),
        startDate: program.start_date,
        status: program.status
      })),
      overallStats: {
        totalDaysClean,
        longestStreak,
        totalPrograms: programs.rows.length,
        checkInStreak: this.calculateCheckInStreak(checkins.rows)
      },
      recentCheckIns: checkins.rows.slice(0, 7),
      achievements: userAchievements.rows.map(achievement => ({
        ...ACHIEVEMENTS[achievement.achievement_key],
        key: achievement.achievement_key,
        earnedAt: achievement.earned_at,
        pointsAwarded: achievement.points_awarded
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// Get health benefits timeline for user's current progress
router.get('/health-benefits', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.query;

    // Get program start date
    const programQuery = `
      SELECT start_date, current_streak, addiction_type_id, at.name as addiction_type
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.id = $1 AND rp.user_id = $2 AND rp.status = 'active'
    `;

    const program = await pool.query(programQuery, [programId, req.user.id]);

    if (program.rows.length === 0) {
      return res.status(404).json({ error: 'Recovery program not found' });
    }

    const startDate = new Date(program.rows[0].start_date);
    const currentStreak = program.rows[0].current_streak;
    const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));

    // Determine which benefits have been unlocked
    const unlockedBenefits = [];
    const upcomingBenefits = [];

    for (const [timeframe, benefit] of Object.entries(HEALTH_BENEFITS)) {
      const requiredDays = this.parseTimeframeToDays(timeframe);
      
      if (daysSinceStart >= requiredDays) {
        unlockedBenefits.push({
          ...benefit,
          timeframe,
          requiredDays,
          unlockedAt: new Date(startDate.getTime() + requiredDays * 24 * 60 * 60 * 1000)
        });
      } else {
        upcomingBenefits.push({
          ...benefit,
          timeframe,
          requiredDays,
          daysUntilUnlock: requiredDays - daysSinceStart,
          unlockDate: new Date(startDate.getTime() + requiredDays * 24 * 60 * 60 * 1000)
        });
      }
    }

    res.json({
      program: {
        addictionType: program.rows[0].addiction_type,
        startDate: startDate,
        currentStreak: currentStreak,
        daysSinceStart: daysSinceStart
      },
      unlockedBenefits: unlockedBenefits.sort((a, b) => a.requiredDays - b.requiredDays),
      upcomingBenefits: upcomingBenefits.sort((a, b) => a.requiredDays - b.requiredDays).slice(0, 3)
    });

  } catch (error) {
    console.error('Get health benefits error:', error);
    res.status(500).json({ error: 'Failed to fetch health benefits' });
  }
});

// Check and award achievements (called after significant actions)
router.post('/check-achievements', authenticateToken, async (req, res) => {
  try {
    const { actionType, metadata = {} } = req.body;

    const newAchievements = [];

    // Get user's current data for achievement checking
    const userData = await this.getUserAchievementData(req.user.id);

    // Check each achievement
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      // Skip if user already has this achievement
      if (userData.existingAchievements.includes(key)) {
        continue;
      }

      // Check if achievement criteria are met
      if (this.checkAchievementCriteria(key, achievement, userData, actionType, metadata)) {
        // Award the achievement
        await pool.query(
          `INSERT INTO user_achievements (user_id, achievement_key, points_awarded)
           VALUES ($1, $2, $3)`,
          [req.user.id, key, achievement.points]
        );

        // Update user's total points
        await pool.query(
          `UPDATE users SET achievement_points = COALESCE(achievement_points, 0) + $1 
           WHERE id = $2`,
          [achievement.points, req.user.id]
        );

        newAchievements.push({
          ...achievement,
          key: key,
          earnedAt: new Date()
        });

        // Log achievement earning
        await SecurityAudit.logEvent({
          userId: req.user.id,
          eventType: 'achievement_earned',
          eventDescription: `User earned achievement: ${achievement.name}`,
          severity: 'info',
          metadata: {
            achievementKey: key,
            achievementName: achievement.name,
            pointsAwarded: achievement.points,
            actionType: actionType
          }
        });
      }
    }

    res.json({
      newAchievements: newAchievements,
      totalNewPoints: newAchievements.reduce((sum, ach) => sum + ach.points, 0)
    });

  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// Get leaderboard for community motivation
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { timeframe = 'all_time', type = 'points' } = req.query;

    let query;
    let params = [];

    if (type === 'points') {
      query = `
        SELECT u.id, u.username, u.first_name, u.profile_picture_url,
               COALESCE(u.achievement_points, 0) as total_points,
               COUNT(ua.id) as achievement_count
        FROM users u
        LEFT JOIN user_achievements ua ON u.id = ua.user_id
        WHERE u.is_active = true
        GROUP BY u.id, u.username, u.first_name, u.profile_picture_url, u.achievement_points
        ORDER BY total_points DESC, achievement_count DESC
        LIMIT 50
      `;
    } else if (type === 'streak') {
      query = `
        SELECT u.id, u.username, u.first_name, u.profile_picture_url,
               MAX(rp.current_streak) as longest_current_streak,
               MAX(rp.longest_streak) as longest_ever_streak
        FROM users u
        JOIN recovery_programs rp ON u.id = rp.user_id
        WHERE u.is_active = true AND rp.status = 'active'
        GROUP BY u.id, u.username, u.first_name, u.profile_picture_url
        ORDER BY longest_current_streak DESC, longest_ever_streak DESC
        LIMIT 50
      `;
    }

    const result = await pool.query(query, params);

    // Filter sensitive data
    const leaderboard = result.rows.map((user, index) => 
      DataFilter.filterUserData({
        ...user,
        rank: index + 1
      }, {
        includeEmail: false,
        requesterRole: req.user.role
      })
    );

    res.json({
      leaderboard: leaderboard,
      userRank: this.findUserRank(leaderboard, req.user.id),
      timeframe: timeframe,
      type: type
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Helper methods
router.calculateCheckInStreak = function(checkIns) {
  if (!checkIns.length) return 0;
  
  let streak = 0;
  let currentDate = new Date();
  
  for (const checkIn of checkIns) {
    const checkInDate = new Date(checkIn.checkin_date);
    const daysDiff = Math.floor((currentDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === streak) {
      streak++;
      currentDate = checkInDate;
    } else {
      break;
    }
  }
  
  return streak;
};

router.parseTimeframeToDays = function(timeframe) {
  const timeMap = {
    '1_day': 1,
    '3_days': 3,
    '1_week': 7,
    '2_weeks': 14,
    '1_month': 30,
    '3_months': 90,
    '6_months': 180,
    '1_year': 365,
    '15_months': 450,
    '18_months': 540,
    '2_years': 730
  };
  return timeMap[timeframe] || 0;
};

router.getUserAchievementData = async function(userId) {
  // Get existing achievements
  const achievementsResult = await pool.query(
    'SELECT achievement_key FROM user_achievements WHERE user_id = $1',
    [userId]
  );

  // Get user stats for achievement checking
  const statsResult = await pool.query(`
    SELECT 
      COUNT(DISTINCT rp.id) as program_count,
      MAX(rp.current_streak) as max_current_streak,
      MAX(rp.longest_streak) as max_longest_streak,
      COUNT(DISTINCT dc.id) as total_checkins,
      COUNT(DISTINCT CASE WHEN dc.checkin_date >= CURRENT_DATE - INTERVAL '7 days' THEN dc.id END) as recent_checkins
    FROM recovery_programs rp
    LEFT JOIN daily_checkins dc ON rp.user_id = dc.user_id
    WHERE rp.user_id = $1
  `, [userId]);

  return {
    existingAchievements: achievementsResult.rows.map(row => row.achievement_key),
    stats: statsResult.rows[0]
  };
};

router.checkAchievementCriteria = function(key, achievement, userData, actionType, metadata) {
  const stats = userData.stats;

  switch (key) {
    case 'first_day':
      return stats.max_current_streak >= 1;
    case 'one_week':
      return stats.max_current_streak >= 7;
    case 'two_weeks':
      return stats.max_current_streak >= 14;
    case 'one_month':
      return stats.max_current_streak >= 30;
    case 'ninety_days':
      return stats.max_current_streak >= 90;
    case 'six_months':
      return stats.max_current_streak >= 180;
    case 'one_year':
      return stats.max_current_streak >= 365;
    case 'daily_checkin_streak_7':
      return stats.recent_checkins >= 7;
    case 'journal_entries_10':
      return actionType === 'journal_entry' && metadata.totalEntries >= 10;
    case 'community_supporter':
      return actionType === 'community_help' && metadata.helpCount >= 5;
    case 'crisis_overcome':
      return actionType === 'crisis_resolved';
    default:
      return false;
  }
};

router.findUserRank = function(leaderboard, userId) {
  const userEntry = leaderboard.find(entry => entry.id === userId);
  return userEntry ? userEntry.rank : null;
};

module.exports = router;