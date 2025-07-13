const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all addiction types
router.get('/addiction-types', async (req, res) => {
  try {
    const query = 'SELECT * FROM addiction_types ORDER BY name';
    const result = await pool.query(query);
    
    res.json({
      addictionTypes: result.rows
    });
  } catch (error) {
    console.error('Get addiction types error:', error);
    res.status(500).json({ error: 'Failed to fetch addiction types' });
  }
});

// Get user's recovery programs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT rp.*, at.name as addiction_type_name, at.color as addiction_type_color
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.user_id = $1
      ORDER BY rp.created_at DESC
    `;
    
    const result = await pool.query(query, [req.user.id]);
    
    res.json({
      programs: result.rows
    });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Failed to fetch recovery programs' });
  }
});

// Create new recovery program
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      addictionTypeId,
      programName,
      startDate,
      targetDurationDays,
      notes
    } = req.body;

    if (!addictionTypeId || !programName || !startDate) {
      return res.status(400).json({
        error: 'Addiction type, program name, and start date are required'
      });
    }

    const query = `
      INSERT INTO recovery_programs (
        user_id, addiction_type_id, program_name, start_date, 
        target_duration_days, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      req.user.id,
      addictionTypeId,
      programName,
      startDate,
      targetDurationDays,
      notes
    ]);

    const program = result.rows[0];

    res.status(201).json({
      message: 'Recovery program created successfully',
      program
    });

  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Failed to create recovery program' });
  }
});

// Get specific recovery program
router.get('/:programId', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;

    const query = `
      SELECT rp.*, at.name as addiction_type_name, at.color as addiction_type_color
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.id = $1 AND rp.user_id = $2
    `;

    const result = await pool.query(query, [programId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recovery program not found' });
    }

    res.json({
      program: result.rows[0]
    });

  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ error: 'Failed to fetch recovery program' });
  }
});

// Update recovery program
router.put('/:programId', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;
    const {
      programName,
      targetDurationDays,
      status,
      notes
    } = req.body;

    const query = `
      UPDATE recovery_programs 
      SET program_name = COALESCE($1, program_name),
          target_duration_days = COALESCE($2, target_duration_days),
          status = COALESCE($3, status),
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [
      programName,
      targetDurationDays,
      status,
      notes,
      programId,
      req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recovery program not found' });
    }

    res.json({
      message: 'Recovery program updated successfully',
      program: result.rows[0]
    });

  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Failed to update recovery program' });
  }
});

// Record a relapse
router.post('/:programId/relapse', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;
    const { relapseDate, notes } = req.body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update program with relapse info
      const updateQuery = `
        UPDATE recovery_programs 
        SET current_streak = 0,
            last_relapse_date = $1,
            notes = COALESCE($2, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        relapseDate,
        notes,
        programId,
        req.user.id
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('Recovery program not found');
      }

      // Record progress metric
      await client.query(
        'INSERT INTO progress_metrics (user_id, program_id, metric_type, metric_value, metric_date, notes) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.user.id, programId, 'relapse', 1, relapseDate, notes]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Relapse recorded successfully',
        program: updateResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Record relapse error:', error);
    res.status(500).json({ error: 'Failed to record relapse' });
  }
});

// Get daily check-ins for a program
router.get('/:programId/checkins', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    let query = `
      SELECT * FROM daily_checkins 
      WHERE user_id = $1 AND program_id = $2
    `;
    
    const params = [req.user.id, programId];

    if (startDate) {
      query += ` AND checkin_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND checkin_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY checkin_date DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      checkins: result.rows
    });

  } catch (error) {
    console.error('Get checkins error:', error);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

// Create or update daily check-in
router.post('/:programId/checkins', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;
    const {
      checkinDate,
      moodRating,
      cravingsIntensity,
      stressLevel,
      sleepQuality,
      exerciseMinutes,
      meditationMinutes,
      journalEntry,
      triggers,
      copingStrategiesUsed,
      supportSystemUsed
    } = req.body;

    if (!checkinDate || !moodRating) {
      return res.status(400).json({
        error: 'Check-in date and mood rating are required'
      });
    }

    const query = `
      INSERT INTO daily_checkins (
        user_id, program_id, checkin_date, mood_rating, cravings_intensity,
        stress_level, sleep_quality, exercise_minutes, meditation_minutes,
        journal_entry, triggers, coping_strategies_used, support_system_used
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id, program_id, checkin_date)
      DO UPDATE SET
        mood_rating = EXCLUDED.mood_rating,
        cravings_intensity = EXCLUDED.cravings_intensity,
        stress_level = EXCLUDED.stress_level,
        sleep_quality = EXCLUDED.sleep_quality,
        exercise_minutes = EXCLUDED.exercise_minutes,
        meditation_minutes = EXCLUDED.meditation_minutes,
        journal_entry = EXCLUDED.journal_entry,
        triggers = EXCLUDED.triggers,
        coping_strategies_used = EXCLUDED.coping_strategies_used,
        support_system_used = EXCLUDED.support_system_used,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      req.user.id,
      programId,
      checkinDate,
      moodRating,
      cravingsIntensity,
      stressLevel,
      sleepQuality,
      exerciseMinutes,
      meditationMinutes,
      journalEntry,
      JSON.stringify(triggers || []),
      JSON.stringify(copingStrategiesUsed || []),
      supportSystemUsed
    ]);

    // Update current streak if check-in is for today
    const today = new Date().toISOString().split('T')[0];
    if (checkinDate === today) {
      await updateCurrentStreak(req.user.id, programId);
    }

    res.json({
      message: 'Check-in saved successfully',
      checkin: result.rows[0]
    });

  } catch (error) {
    console.error('Create checkin error:', error);
    res.status(500).json({ error: 'Failed to save check-in' });
  }
});

// Get program statistics
router.get('/:programId/stats', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_checkins,
        AVG(mood_rating) as avg_mood,
        AVG(cravings_intensity) as avg_cravings,
        AVG(stress_level) as avg_stress,
        AVG(sleep_quality) as avg_sleep,
        SUM(exercise_minutes) as total_exercise,
        SUM(meditation_minutes) as total_meditation
      FROM daily_checkins 
      WHERE user_id = $1 AND program_id = $2
    `;

    const statsResult = await pool.query(statsQuery, [req.user.id, programId]);

    const programQuery = `
      SELECT current_streak, longest_streak, start_date, last_relapse_date
      FROM recovery_programs 
      WHERE id = $1 AND user_id = $2
    `;

    const programResult = await pool.query(programQuery, [programId, req.user.id]);

    if (programResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recovery program not found' });
    }

    const program = programResult.rows[0];
    const stats = statsResult.rows[0];

    // Calculate days since start
    const startDate = new Date(program.start_date);
    const today = new Date();
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    res.json({
      stats: {
        currentStreak: program.current_streak,
        longestStreak: program.longest_streak,
        daysSinceStart,
        totalCheckins: parseInt(stats.total_checkins),
        averageMood: parseFloat(stats.avg_mood) || 0,
        averageCravings: parseFloat(stats.avg_cravings) || 0,
        averageStress: parseFloat(stats.avg_stress) || 0,
        averageSleep: parseFloat(stats.avg_sleep) || 0,
        totalExercise: parseInt(stats.total_exercise) || 0,
        totalMeditation: parseInt(stats.total_meditation) || 0,
        lastRelapseDate: program.last_relapse_date
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch program statistics' });
  }
});

// Helper function to update current streak
async function updateCurrentStreak(userId, programId) {
  try {
    const streakQuery = `
      WITH consecutive_days AS (
        SELECT checkin_date,
               checkin_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY checkin_date DESC) - 1) AS group_date
        FROM daily_checkins
        WHERE user_id = $1 AND program_id = $2
        ORDER BY checkin_date DESC
      ),
      current_streak AS (
        SELECT COUNT(*) as streak_count
        FROM consecutive_days
        WHERE group_date = (SELECT group_date FROM consecutive_days LIMIT 1)
      )
      UPDATE recovery_programs 
      SET current_streak = (SELECT streak_count FROM current_streak),
          longest_streak = GREATEST(longest_streak, (SELECT streak_count FROM current_streak))
      WHERE id = $2 AND user_id = $1
    `;

    await pool.query(streakQuery, [userId, programId]);
  } catch (error) {
    console.error('Update streak error:', error);
  }
}

module.exports = router;