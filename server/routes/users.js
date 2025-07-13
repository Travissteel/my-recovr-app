const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.username, 
        u.phone, u.date_of_birth, u.gender, u.created_at, 
        u.profile_picture_url, u.bio, u.privacy_settings, u.preferences,
        COUNT(DISTINCT rp.id) as active_programs,
        COUNT(DISTINCT dc.id) as total_checkins,
        MAX(rp.current_streak) as longest_current_streak
      FROM users u
      LEFT JOIN recovery_programs rp ON u.id = rp.user_id AND rp.status = 'active'
      LEFT JOIN daily_checkins dc ON u.id = dc.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `;

    const result = await pool.query(query, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Filter user data for safe response - user viewing their own profile
    const filteredUser = DataFilter.filterUserData(user, {
      includeEmail: true,
      includePhone: true,
      includeSensitiveMetadata: true,
      isOwner: true,
      requesterRole: req.user.role
    });

    // Add stats that are safe to include
    filteredUser.stats = {
      activePrograms: parseInt(user.active_programs),
      totalCheckins: parseInt(user.total_checkins),
      longestCurrentStreak: parseInt(user.longest_current_streak) || 0
    };

    res.json({
      user: filteredUser
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get user's active programs with recent check-ins
    const programsQuery = `
      SELECT 
        rp.id, rp.program_name, rp.current_streak, rp.longest_streak,
        rp.start_date, rp.status, rp.target_duration_days,
        at.name as addiction_type, at.color as addiction_color,
        COALESCE(dc.checkin_date, NULL) as last_checkin,
        COALESCE(dc.mood_rating, 0) as last_mood
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

    const programsResult = await pool.query(programsQuery, [req.user.id]);

    // Get overall stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT rp.id) as total_programs,
        COUNT(DISTINCT dc.id) as total_checkins,
        AVG(dc.mood_rating) as avg_mood,
        MAX(rp.current_streak) as best_streak,
        COUNT(DISTINCT ci.id) as crisis_interventions
      FROM recovery_programs rp
      LEFT JOIN daily_checkins dc ON rp.id = dc.program_id
      LEFT JOIN crisis_interventions ci ON rp.user_id = ci.user_id
      WHERE rp.user_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [req.user.id]);

    const stats = statsResult.rows[0];

    // Filter program data to remove any sensitive information
    const filteredPrograms = programsResult.rows.map(program => 
      DataFilter.filterSensitiveData(program, {
        allowSensitive: false,
        requesterRole: req.user.role
      })
    );

    res.json({
      programs: filteredPrograms,
      stats: {
        totalPrograms: parseInt(stats.total_programs) || 0,
        totalCheckins: parseInt(stats.total_checkins) || 0,
        averageMood: parseFloat(stats.avg_mood) || 0,
        bestStreak: parseInt(stats.best_streak) || 0,
        crisisInterventions: parseInt(stats.crisis_interventions) || 0
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;