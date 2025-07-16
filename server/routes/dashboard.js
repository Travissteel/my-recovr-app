const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

/**
 * Enhanced Dashboard Routes
 * Engaging and motivational dashboard design for recovery tracking
 */

// Get comprehensive dashboard data for recovery tracking
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user's active recovery programs with detailed stats
    const programsQuery = `
      SELECT rp.id, rp.program_name, rp.current_streak, rp.longest_streak,
             rp.start_date, rp.status, rp.target_duration_days,
             at.name as addiction_type, at.color as addiction_color, at.icon,
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400 AS total_days,
             rp.daily_cost,
             COALESCE(dc.checkin_date, NULL) as last_checkin,
             COALESCE(dc.mood_rating, 0) as last_mood,
             COALESCE(dc.craving_intensity, 0) as last_craving
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      LEFT JOIN daily_checkins dc ON rp.id = dc.program_id 
        AND dc.checkin_date = (
          SELECT MAX(checkin_date) FROM daily_checkins 
          WHERE program_id = rp.id AND user_id = $1
        )
      WHERE rp.user_id = $1 AND rp.status = 'active'
      ORDER BY rp.created_at DESC
    `;

    const programs = await pool.query(programsQuery, [req.user.id]);

    // Get user's achievements and level
    const achievementsQuery = `
      SELECT ua.achievement_key, ua.earned_at, ua.points_awarded,
             u.achievement_points, u.level, u.experience_points
      FROM user_achievements ua, users u
      WHERE ua.user_id = $1 AND u.id = $1
      ORDER BY ua.earned_at DESC
      LIMIT 5
    `;

    const achievements = await pool.query(achievementsQuery, [req.user.id]);

    // Get today's motivational content
    const motivationalQuery = `
      SELECT content_type, title, content, author, category
      FROM motivational_content 
      WHERE is_active = true 
      AND (addiction_types = '[]' OR addiction_types ?| $1)
      ORDER BY RANDOM() 
      LIMIT 3
    `;

    const addictionTypes = programs.rows.map(p => p.addiction_type);
    const motivational = await pool.query(motivationalQuery, [addictionTypes]);

    // Get today's challenge
    const todaysChallengeQuery = `
      SELECT dc.id, dc.title, dc.description, dc.challenge_type, 
             dc.difficulty_level, dc.points_reward, dc.instructions,
             udc.status as user_status, udc.completion_notes
      FROM daily_challenges dc
      LEFT JOIN user_daily_challenges udc ON dc.id = udc.challenge_id 
        AND udc.user_id = $1 AND udc.challenge_date = CURRENT_DATE
      WHERE dc.is_active = true
      ORDER BY 
        CASE WHEN udc.status IS NULL THEN 1 ELSE 2 END,
        RANDOM()
      LIMIT 1
    `;

    const todaysChallenge = await pool.query(todaysChallengeQuery, [req.user.id]);

    // Get recent journal entries
    const journalQuery = `
      SELECT id, title, content, mood_rating, craving_intensity, 
             entry_date, created_at
      FROM journal_entries 
      WHERE user_id = $1 
      ORDER BY entry_date DESC, created_at DESC
      LIMIT 3
    `;

    const recentJournals = await pool.query(journalQuery, [req.user.id]);

    // Calculate money saved
    const moneySavedQuery = `
      SELECT SUM(amount_saved) as total_saved,
             COUNT(*) as calculation_count
      FROM money_saved_log 
      WHERE user_id = $1
    `;

    const moneySaved = await pool.query(moneySavedQuery, [req.user.id]);

    // Get health improvements
    const healthQuery = `
      SELECT improvement_type, improvement_description,
             severity_before, severity_after, improvement_date
      FROM health_improvements 
      WHERE user_id = $1 
      ORDER BY improvement_date DESC
      LIMIT 5
    `;

    const healthImprovements = await pool.query(healthQuery, [req.user.id]);

    // Get weekly mood trends
    const moodTrendsQuery = `
      SELECT DATE_TRUNC('day', checkin_date) as day,
             AVG(mood_rating) as avg_mood,
             AVG(energy_level) as avg_energy,
             AVG(craving_intensity) as avg_craving
      FROM daily_checkins 
      WHERE user_id = $1 
      AND checkin_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', checkin_date)
      ORDER BY day
    `;

    const moodTrends = await pool.query(moodTrendsQuery, [req.user.id]);

    // Get community highlights (if user has opted into social features)
    const communityQuery = `
      SELECT COUNT(DISTINCT id) as community_members,
             COUNT(DISTINCT CASE WHEN last_activity > CURRENT_DATE - INTERVAL '24 hours' THEN id END) as active_today
      FROM users 
      WHERE is_active = true
    `;

    const communityStats = await pool.query(communityQuery);

    // Calculate overall recovery score (0-100)
    const recoveryScore = this.calculateRecoveryScore(programs.rows, achievements.rows);

    // Build comprehensive dashboard response
    const dashboard = {
      user: {
        level: achievements.rows[0]?.level || 1,
        experiencePoints: achievements.rows[0]?.experience_points || 0,
        achievementPoints: achievements.rows[0]?.achievement_points || 0,
        recoveryScore: recoveryScore
      },
      programs: programs.rows.map(program => ({
        id: program.id,
        name: program.program_name,
        addictionType: program.addiction_type,
        color: program.addiction_color,
        icon: program.icon,
        currentStreak: program.current_streak,
        longestStreak: program.longest_streak,
        totalDays: Math.floor(program.total_days),
        startDate: program.start_date,
        lastCheckin: program.last_checkin,
        lastMood: program.last_mood,
        lastCraving: program.last_craving,
        dailyCost: program.daily_cost
      })),
      achievements: {
        recent: achievements.rows.map(ach => ({
          key: ach.achievement_key,
          earnedAt: ach.earned_at,
          points: ach.points_awarded
        })),
        totalPoints: achievements.rows[0]?.achievement_points || 0
      },
      todaysChallenge: todaysChallenge.rows[0] ? {
        id: todaysChallenge.rows[0].id,
        title: todaysChallenge.rows[0].title,
        description: todaysChallenge.rows[0].description,
        type: todaysChallenge.rows[0].challenge_type,
        difficulty: todaysChallenge.rows[0].difficulty_level,
        pointsReward: todaysChallenge.rows[0].points_reward,
        instructions: todaysChallenge.rows[0].instructions,
        status: todaysChallenge.rows[0].user_status || 'available'
      } : null,
      motivation: {
        quotes: motivational.rows,
        healthBenefits: this.getUpcomingHealthBenefit(programs.rows)
      },
      finances: {
        totalSaved: parseFloat(moneySaved.rows[0]?.total_saved || 0),
        calculationCount: parseInt(moneySaved.rows[0]?.calculation_count || 0)
      },
      health: {
        improvements: healthImprovements.rows,
        improvementCount: healthImprovements.rows.length
      },
      trends: {
        mood: moodTrends.rows,
        weeklyAverage: this.calculateWeeklyAverages(moodTrends.rows)
      },
      journal: {
        recentEntries: recentJournals.rows.map(entry => ({
          id: entry.id,
          title: entry.title,
          excerpt: entry.content.substring(0, 100) + '...',
          mood: entry.mood_rating,
          craving: entry.craving_intensity,
          date: entry.entry_date
        })),
        totalEntries: recentJournals.rows.length
      },
      community: {
        totalMembers: parseInt(communityStats.rows[0]?.community_members || 0),
        activeToday: parseInt(communityStats.rows[0]?.active_today || 0)
      },
      insights: this.generateInsights(programs.rows, moodTrends.rows, achievements.rows)
    };

    res.json(dashboard);

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get detailed weekly report for progress tracking
router.get('/weekly-report', authenticateToken, async (req, res) => {
  try {
    const { week_offset = 0 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (7 * week_offset) - startDate.getDay());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Get weekly check-ins
    const checkinsQuery = `
      SELECT checkin_date, mood_rating, energy_level, craving_intensity,
             sleep_quality, stress_level, productivity_level,
             trigger_notes, gratitude_notes
      FROM daily_checkins 
      WHERE user_id = $1 
      AND checkin_date BETWEEN $2 AND $3
      ORDER BY checkin_date
    `;

    const checkins = await pool.query(checkinsQuery, [req.user.id, startDate, endDate]);

    // Get achievements earned this week
    const achievementsQuery = `
      SELECT achievement_key, earned_at, points_awarded
      FROM user_achievements 
      WHERE user_id = $1 
      AND earned_at BETWEEN $2 AND $3
      ORDER BY earned_at
    `;

    const weeklyAchievements = await pool.query(achievementsQuery, [req.user.id, startDate, endDate]);

    // Get challenges completed this week
    const challengesQuery = `
      SELECT dc.title, dc.challenge_type, udc.status, udc.completion_notes,
             udc.points_earned, udc.completed_at
      FROM user_daily_challenges udc
      JOIN daily_challenges dc ON udc.challenge_id = dc.id
      WHERE udc.user_id = $1 
      AND udc.challenge_date BETWEEN $2 AND $3
      AND udc.status = 'completed'
      ORDER BY udc.completed_at
    `;

    const challenges = await pool.query(challengesQuery, [req.user.id, startDate, endDate]);

    // Calculate weekly statistics
    const weeklyStats = this.calculateWeeklyStats(checkins.rows);

    const report = {
      weekPeriod: {
        start: startDate,
        end: endDate,
        weekNumber: Math.ceil((new Date() - startDate) / (7 * 24 * 60 * 60 * 1000))
      },
      summary: {
        checkInsCompleted: checkins.rows.length,
        challengesCompleted: challenges.rows.length,
        achievementsEarned: weeklyAchievements.rows.length,
        totalPointsEarned: weeklyAchievements.rows.reduce((sum, ach) => sum + ach.points_awarded, 0)
      },
      trends: weeklyStats,
      achievements: weeklyAchievements.rows,
      challenges: challenges.rows,
      insights: this.generateWeeklyInsights(weeklyStats, checkins.rows),
      nextWeekRecommendations: this.generateRecommendations(weeklyStats)
    };

    res.json(report);

  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

// Helper methods
router.calculateRecoveryScore = function(programs, achievements) {
  if (!programs.length) return 0;
  
  const streakScore = Math.min(programs.reduce((max, p) => Math.max(max, p.current_streak), 0) * 2, 50);
  const achievementScore = Math.min(achievements.length * 5, 30);
  const consistencyScore = 20; // Based on check-in consistency (simplified)
  
  return Math.min(streakScore + achievementScore + consistencyScore, 100);
};

router.getUpcomingHealthBenefit = function(programs) {
  if (!programs.length) return null;
  
  const maxDays = Math.max(...programs.map(p => Math.floor(p.total_days)));
  
  const benefits = [
    { days: 1, benefit: "Dopamine receptors begin to stabilize" },
    { days: 3, benefit: "Brain starts reducing addictive pathways" },
    { days: 7, benefit: "Significant reduction in cravings" },
    { days: 14, benefit: "Enhanced mood stability" },
    { days: 30, benefit: "Significant brain restructuring" },
    { days: 90, benefit: "Complete neurological reboot achieved" }
  ];
  
  return benefits.find(b => b.days > maxDays) || benefits[benefits.length - 1];
};

router.calculateWeeklyAverages = function(moodTrends) {
  if (!moodTrends.length) return {};
  
  return {
    avgMood: moodTrends.reduce((sum, day) => sum + parseFloat(day.avg_mood || 0), 0) / moodTrends.length,
    avgEnergy: moodTrends.reduce((sum, day) => sum + parseFloat(day.avg_energy || 0), 0) / moodTrends.length,
    avgCraving: moodTrends.reduce((sum, day) => sum + parseFloat(day.avg_craving || 0), 0) / moodTrends.length
  };
};

router.generateInsights = function(programs, moodTrends, achievements) {
  const insights = [];
  
  if (programs.length > 0) {
    const avgStreak = programs.reduce((sum, p) => sum + p.current_streak, 0) / programs.length;
    if (avgStreak >= 7) {
      insights.push({
        type: 'positive',
        message: `Amazing! Your average streak is ${Math.round(avgStreak)} days. You're building strong recovery habits!`,
        icon: '🔥'
      });
    }
  }
  
  if (moodTrends.length >= 3) {
    const recentMood = parseFloat(moodTrends[moodTrends.length - 1]?.avg_mood || 0);
    const earlierMood = parseFloat(moodTrends[0]?.avg_mood || 0);
    
    if (recentMood > earlierMood + 1) {
      insights.push({
        type: 'positive',
        message: "Your mood has been trending upward this week! Keep up the great work.",
        icon: '📈'
      });
    }
  }
  
  if (achievements.length >= 3) {
    insights.push({
      type: 'achievement',
      message: `You've earned ${achievements.length} achievements! You're making excellent progress.`,
      icon: '🏆'
    });
  }
  
  return insights;
};

router.calculateWeeklyStats = function(checkins) {
  if (!checkins.length) return {};
  
  return {
    avgMood: checkins.reduce((sum, c) => sum + (c.mood_rating || 0), 0) / checkins.length,
    avgEnergy: checkins.reduce((sum, c) => sum + (c.energy_level || 0), 0) / checkins.length,
    avgCraving: checkins.reduce((sum, c) => sum + (c.craving_intensity || 0), 0) / checkins.length,
    avgSleep: checkins.reduce((sum, c) => sum + (c.sleep_quality || 0), 0) / checkins.length,
    avgStress: checkins.reduce((sum, c) => sum + (c.stress_level || 0), 0) / checkins.length
  };
};

router.generateWeeklyInsights = function(stats, checkins) {
  const insights = [];
  
  if (stats.avgMood >= 7) {
    insights.push("Your mood was excellent this week! Keep doing what you're doing.");
  }
  
  if (stats.avgCraving <= 3) {
    insights.push("Cravings were well-managed this week. Your strategies are working!");
  }
  
  if (checkins.length >= 6) {
    insights.push("Great consistency with daily check-ins! This builds strong recovery habits.");
  }
  
  return insights;
};

router.generateRecommendations = function(stats) {
  const recommendations = [];
  
  if (stats.avgMood < 5) {
    recommendations.push({
      type: 'mood',
      suggestion: "Try adding 10 minutes of mindfulness meditation to your daily routine",
      difficulty: 'easy'
    });
  }
  
  if (stats.avgEnergy < 5) {
    recommendations.push({
      type: 'energy',
      suggestion: "Consider adding light exercise or a daily walk to boost energy levels",
      difficulty: 'moderate'
    });
  }
  
  if (stats.avgCraving > 6) {
    recommendations.push({
      type: 'craving',
      suggestion: "Identify your biggest triggers and create specific coping strategies",
      difficulty: 'moderate'
    });
  }
  
  return recommendations;
};

module.exports = router;