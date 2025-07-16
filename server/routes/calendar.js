const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

/**
 * Interactive Calendar Routes
 * Interactive calendar with mood tracking, trigger logging, and visual progress
 */

// Get calendar data for a specific month
router.get('/month/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get daily check-ins for the month
    const checkinsQuery = `
      SELECT 
        dc.checkin_date,
        dc.mood_rating,
        dc.energy_level,
        dc.craving_intensity,
        dc.sleep_quality,
        dc.stress_level,
        dc.productivity_level,
        dc.trigger_notes,
        dc.gratitude_notes,
        dc.recovery_actions,
        rp.program_name,
        rp.id as program_id,
        at.name as addiction_type,
        at.color as addiction_color,
        at.icon as addiction_icon
      FROM daily_checkins dc
      JOIN recovery_programs rp ON dc.program_id = rp.id
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE dc.user_id = $1 
      AND dc.checkin_date BETWEEN $2 AND $3
      ORDER BY dc.checkin_date, rp.program_name
    `;

    const checkins = await pool.query(checkinsQuery, [req.user.id, startDate, endDate]);

    // Get program streaks for visual representation
    const streaksQuery = `
      SELECT 
        rp.id,
        rp.program_name,
        rp.current_streak,
        rp.start_date,
        at.name as addiction_type,
        at.color,
        at.icon,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400 AS total_days
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.user_id = $1 AND rp.status = 'active'
    `;

    const programs = await pool.query(streaksQuery, [req.user.id]);

    // Get triggers for the month
    const triggersQuery = `
      SELECT 
        trigger_date,
        trigger_type,
        intensity_level,
        situation_description,
        coping_strategy_used,
        outcome,
        notes
      FROM trigger_logs 
      WHERE user_id = $1 
      AND trigger_date BETWEEN $2 AND $3
      ORDER BY trigger_date
    `;

    const triggers = await pool.query(triggersQuery, [req.user.id, startDate, endDate]);

    // Get achievements earned this month
    const achievementsQuery = `
      SELECT 
        DATE(earned_at) as achievement_date,
        achievement_key,
        points_awarded
      FROM user_achievements 
      WHERE user_id = $1 
      AND DATE(earned_at) BETWEEN $2 AND $3
      ORDER BY earned_at
    `;

    const achievements = await pool.query(achievementsQuery, [req.user.id, startDate, endDate]);

    // Get daily challenges completed this month
    const challengesQuery = `
      SELECT 
        udc.challenge_date,
        udc.status,
        udc.points_earned,
        dc.title,
        dc.challenge_type,
        dc.difficulty_level
      FROM user_daily_challenges udc
      JOIN daily_challenges dc ON udc.challenge_id = dc.id
      WHERE udc.user_id = $1 
      AND udc.challenge_date BETWEEN $2 AND $3
      ORDER BY udc.challenge_date
    `;

    const challenges = await pool.query(challengesQuery, [req.user.id, startDate, endDate]);

    // Organize data by date
    const calendarData = {};
    
    // Initialize all days of the month
    for (let day = 1; day <= endDate.getDate(); day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      calendarData[dateStr] = {
        date: dateStr,
        checkins: [],
        triggers: [],
        achievements: [],
        challenges: [],
        dayType: 'normal', // normal, streak, relapse, milestone
        overallMood: null,
        streakDays: {}
      };
    }

    // Add check-ins
    checkins.rows.forEach(checkin => {
      const dateStr = checkin.checkin_date.toISOString().split('T')[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].checkins.push({
          programId: checkin.program_id,
          programName: checkin.program_name,
          addictionType: checkin.addiction_type,
          color: checkin.addiction_color,
          icon: checkin.addiction_icon,
          mood: checkin.mood_rating,
          energy: checkin.energy_level,
          craving: checkin.craving_intensity,
          sleep: checkin.sleep_quality,
          stress: checkin.stress_level,
          productivity: checkin.productivity_level,
          triggerNotes: checkin.trigger_notes,
          gratitudeNotes: checkin.gratitude_notes,
          recoveryActions: checkin.recovery_actions
        });

        // Calculate overall mood for the day
        const dayCheckins = calendarData[dateStr].checkins;
        calendarData[dateStr].overallMood = dayCheckins.reduce((sum, c) => sum + (c.mood || 0), 0) / dayCheckins.length;
      }
    });

    // Add triggers
    triggers.rows.forEach(trigger => {
      const dateStr = trigger.trigger_date.toISOString().split('T')[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].triggers.push({
          type: trigger.trigger_type,
          intensity: trigger.intensity_level,
          situation: trigger.situation_description,
          copingStrategy: trigger.coping_strategy_used,
          outcome: trigger.outcome,
          notes: trigger.notes
        });
      }
    });

    // Add achievements
    achievements.rows.forEach(achievement => {
      const dateStr = achievement.achievement_date.toISOString().split('T')[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].achievements.push({
          key: achievement.achievement_key,
          points: achievement.points_awarded
        });
      }
    });

    // Add challenges
    challenges.rows.forEach(challenge => {
      const dateStr = challenge.challenge_date.toISOString().split('T')[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].challenges.push({
          title: challenge.title,
          type: challenge.challenge_type,
          difficulty: challenge.difficulty_level,
          status: challenge.status,
          points: challenge.points_earned
        });
      }
    });

    // Calculate streak visualization for each program
    programs.rows.forEach(program => {
      const programStartDate = new Date(program.start_date);
      const currentStreak = program.current_streak;
      
      // Mark days that are part of current streak
      for (let i = 0; i < currentStreak && i < 31; i++) {
        const streakDate = new Date();
        streakDate.setDate(streakDate.getDate() - i);
        
        if (streakDate.getMonth() === month - 1 && streakDate.getFullYear() == year) {
          const dateStr = streakDate.toISOString().split('T')[0];
          if (calendarData[dateStr]) {
            calendarData[dateStr].streakDays[program.id] = {
              programName: program.program_name,
              addictionType: program.addiction_type,
              color: program.color,
              icon: program.icon,
              streakDay: i + 1
            };
          }
        }
      }
    });

    // Determine day types based on data
    Object.values(calendarData).forEach(day => {
      if (day.achievements.length > 0) {
        day.dayType = 'milestone';
      } else if (Object.keys(day.streakDays).length > 0) {
        day.dayType = 'streak';
      } else if (day.triggers.some(t => t.outcome === 'relapse')) {
        day.dayType = 'relapse';
      }
    });

    const response = {
      month: {
        year: parseInt(year),
        month: parseInt(month),
        startDate,
        endDate
      },
      programs: programs.rows.map(p => ({
        id: p.id,
        name: p.program_name,
        addictionType: p.addiction_type,
        color: p.color,
        icon: p.icon,
        currentStreak: p.current_streak,
        totalDays: Math.floor(p.total_days)
      })),
      calendarData: Object.values(calendarData),
      monthlyStats: this.calculateMonthlyStats(Object.values(calendarData))
    };

    res.json(response);

  } catch (error) {
    console.error('Calendar month error:', error);
    res.status(500).json({ error: 'Failed to load calendar data' });
  }
});

// Get detailed day data
router.get('/day/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);

    // Get comprehensive day data
    const dayQuery = `
      SELECT 
        dc.*,
        rp.program_name,
        rp.id as program_id,
        at.name as addiction_type,
        at.color as addiction_color,
        at.icon as addiction_icon
      FROM daily_checkins dc
      JOIN recovery_programs rp ON dc.program_id = rp.id
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE dc.user_id = $1 AND dc.checkin_date = $2
      ORDER BY rp.program_name
    `;

    const checkins = await pool.query(dayQuery, [req.user.id, targetDate]);

    // Get triggers for the day
    const triggersQuery = `
      SELECT * FROM trigger_logs 
      WHERE user_id = $1 AND trigger_date = $2
      ORDER BY created_at
    `;

    const triggers = await pool.query(triggersQuery, [req.user.id, targetDate]);

    // Get achievements earned that day
    const achievementsQuery = `
      SELECT achievement_key, earned_at, points_awarded
      FROM user_achievements 
      WHERE user_id = $1 AND DATE(earned_at) = $2
      ORDER BY earned_at
    `;

    const achievements = await pool.query(achievementsQuery, [req.user.id, targetDate]);

    // Get challenges for that day
    const challengesQuery = `
      SELECT 
        udc.*,
        dc.title,
        dc.description,
        dc.challenge_type,
        dc.difficulty_level,
        dc.instructions
      FROM user_daily_challenges udc
      JOIN daily_challenges dc ON udc.challenge_id = dc.id
      WHERE udc.user_id = $1 AND udc.challenge_date = $2
    `;

    const challenges = await pool.query(challengesQuery, [req.user.id, targetDate]);

    // Get journal entries for the day
    const journalQuery = `
      SELECT id, title, content, mood_rating, craving_intensity, 
             entry_date, created_at
      FROM journal_entries 
      WHERE user_id = $1 AND entry_date = $2
      ORDER BY created_at
    `;

    const journals = await pool.query(journalQuery, [req.user.id, targetDate]);

    const dayData = {
      date: targetDate,
      checkins: checkins.rows,
      triggers: triggers.rows,
      achievements: achievements.rows,
      challenges: challenges.rows,
      journals: journals.rows,
      summary: {
        averageMood: checkins.rows.length > 0 ? 
          checkins.rows.reduce((sum, c) => sum + (c.mood_rating || 0), 0) / checkins.rows.length : null,
        averageCraving: checkins.rows.length > 0 ? 
          checkins.rows.reduce((sum, c) => sum + (c.craving_intensity || 0), 0) / checkins.rows.length : null,
        triggerCount: triggers.rows.length,
        achievementCount: achievements.rows.length,
        challengeCompletions: challenges.rows.filter(c => c.status === 'completed').length,
        journalEntries: journals.rows.length
      }
    };

    res.json(dayData);

  } catch (error) {
    console.error('Calendar day error:', error);
    res.status(500).json({ error: 'Failed to load day data' });
  }
});

// Log a trigger event
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const {
      triggerDate,
      triggerType,
      intensityLevel,
      situationDescription,
      copingStrategyUsed,
      outcome,
      notes
    } = req.body;

    // Validate required fields
    if (!triggerDate || !triggerType || !intensityLevel) {
      return res.status(400).json({ 
        error: 'Trigger date, type, and intensity level are required' 
      });
    }

    const insertQuery = `
      INSERT INTO trigger_logs (
        user_id, trigger_date, trigger_type, intensity_level,
        situation_description, coping_strategy_used, outcome, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      req.user.id,
      triggerDate,
      triggerType,
      intensityLevel,
      situationDescription,
      copingStrategyUsed,
      outcome,
      notes
    ]);

    res.status(201).json({
      message: 'Trigger logged successfully',
      trigger: result.rows[0]
    });

  } catch (error) {
    console.error('Log trigger error:', error);
    res.status(500).json({ error: 'Failed to log trigger' });
  }
});

// Update mood for a specific date
router.put('/mood/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const { programId, moodRating, notes } = req.body;

    if (!programId || moodRating === undefined) {
      return res.status(400).json({ 
        error: 'Program ID and mood rating are required' 
      });
    }

    // Check if check-in exists for this date and program
    const existingQuery = `
      SELECT id FROM daily_checkins 
      WHERE user_id = $1 AND program_id = $2 AND checkin_date = $3
    `;

    const existing = await pool.query(existingQuery, [req.user.id, programId, date]);

    let result;
    if (existing.rows.length > 0) {
      // Update existing check-in
      const updateQuery = `
        UPDATE daily_checkins 
        SET mood_rating = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      result = await pool.query(updateQuery, [moodRating, notes, existing.rows[0].id]);
    } else {
      // Create new check-in
      const insertQuery = `
        INSERT INTO daily_checkins (user_id, program_id, checkin_date, mood_rating, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [req.user.id, programId, date, moodRating, notes]);
    }

    res.json({
      message: 'Mood updated successfully',
      checkin: result.rows[0]
    });

  } catch (error) {
    console.error('Update mood error:', error);
    res.status(500).json({ error: 'Failed to update mood' });
  }
});

// Get mood trends for visualization
router.get('/mood-trends', authenticateToken, async (req, res) => {
  try {
    const { days = 30, programId } = req.query;
    
    let query = `
      SELECT 
        DATE(dc.checkin_date) as date,
        AVG(dc.mood_rating) as avg_mood,
        AVG(dc.energy_level) as avg_energy,
        AVG(dc.craving_intensity) as avg_craving,
        COUNT(*) as checkin_count
      FROM daily_checkins dc
      WHERE dc.user_id = $1 
      AND dc.checkin_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
    `;

    const params = [req.user.id];

    if (programId) {
      query += ' AND dc.program_id = $2';
      params.push(programId);
    }

    query += `
      GROUP BY DATE(dc.checkin_date)
      ORDER BY date
    `;

    const trends = await pool.query(query, params);

    res.json({
      trends: trends.rows,
      period: {
        days: parseInt(days),
        programId: programId || 'all'
      }
    });

  } catch (error) {
    console.error('Mood trends error:', error);
    res.status(500).json({ error: 'Failed to get mood trends' });
  }
});

// Helper methods
router.calculateMonthlyStats = function(calendarData) {
  const stats = {
    totalCheckins: 0,
    totalTriggers: 0,
    totalAchievements: 0,
    completedChallenges: 0,
    averageMood: 0,
    streakDays: 0,
    milestoneDays: 0
  };

  let moodSum = 0;
  let moodCount = 0;

  calendarData.forEach(day => {
    stats.totalCheckins += day.checkins.length;
    stats.totalTriggers += day.triggers.length;
    stats.totalAchievements += day.achievements.length;
    stats.completedChallenges += day.challenges.filter(c => c.status === 'completed').length;

    if (day.dayType === 'streak') stats.streakDays++;
    if (day.dayType === 'milestone') stats.milestoneDays++;

    if (day.overallMood !== null) {
      moodSum += day.overallMood;
      moodCount++;
    }
  });

  stats.averageMood = moodCount > 0 ? moodSum / moodCount : 0;

  return stats;
};

module.exports = router;