const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

/**
 * Financial Motivation Routes
 * Money tracking and financial motivation system for recovery support
 */

// Get comprehensive financial overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    // Get all recovery programs with daily costs
    const programsQuery = `
      SELECT 
        rp.id,
        rp.program_name,
        rp.start_date,
        rp.current_streak,
        rp.daily_cost,
        at.name as addiction_type,
        at.icon,
        at.color,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400 AS total_days
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.user_id = $1 AND rp.status = 'active'
      ORDER BY rp.created_at DESC
    `;

    const programs = await pool.query(programsQuery, [req.user.id]);

    // Get money saved logs
    const savedLogsQuery = `
      SELECT 
        msl.*,
        rp.program_name,
        at.name as addiction_type
      FROM money_saved_log msl
      JOIN recovery_programs rp ON msl.program_id = rp.id
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE msl.user_id = $1
      ORDER BY msl.saved_date DESC
      LIMIT 50
    `;

    const savedLogs = await pool.query(savedLogsQuery, [req.user.id]);

    // Calculate current totals
    let totalSaved = 0;
    const programBreakdowns = [];

    programs.rows.forEach(program => {
      const dailyCost = parseFloat(program.daily_cost || 0);
      const totalDays = Math.floor(program.total_days);
      const programSaved = dailyCost * totalDays;
      
      totalSaved += programSaved;
      
      programBreakdowns.push({
        id: program.id,
        name: program.program_name,
        addictionType: program.addiction_type,
        icon: program.icon,
        color: program.color,
        dailyCost: dailyCost,
        currentStreak: program.current_streak,
        totalDays: totalDays,
        totalSaved: programSaved,
        startDate: program.start_date,
        projections: this.calculateProjections(dailyCost, totalDays)
      });
    });

    // Get monthly breakdown
    const monthlyBreakdownQuery = `
      SELECT 
        DATE_TRUNC('month', msl.saved_date) as month,
        SUM(msl.amount_saved) as monthly_saved,
        COUNT(*) as log_count
      FROM money_saved_log msl
      WHERE msl.user_id = $1
      AND msl.saved_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', msl.saved_date)
      ORDER BY month DESC
    `;

    const monthlyBreakdown = await pool.query(monthlyBreakdownQuery, [req.user.id]);

    // Calculate achievements based on money saved
    const achievements = this.calculateFinancialAchievements(totalSaved, programBreakdowns);

    const overview = {
      summary: {
        totalSaved: totalSaved,
        totalPrograms: programs.rows.length,
        averageDailySavings: programBreakdowns.reduce((sum, p) => sum + p.dailyCost, 0),
        lastUpdated: new Date()
      },
      programs: programBreakdowns,
      recentLogs: savedLogs.rows.slice(0, 10).map(log => ({
        id: log.id,
        amount: parseFloat(log.amount_saved),
        date: log.saved_date,
        programName: log.program_name,
        addictionType: log.addiction_type,
        calculationMethod: log.calculation_method,
        notes: log.notes
      })),
      monthlyBreakdown: monthlyBreakdown.rows.map(month => ({
        month: month.month,
        amount: parseFloat(month.monthly_saved),
        logCount: parseInt(month.log_count)
      })),
      achievements: achievements,
      insights: this.generateFinancialInsights(totalSaved, programBreakdowns),
      motivationalGoals: this.generateMotivationalGoals(totalSaved, programBreakdowns)
    };

    res.json(overview);

  } catch (error) {
    console.error('Financial overview error:', error);
    res.status(500).json({ error: 'Failed to load financial overview' });
  }
});

// Update daily cost for a program
router.put('/program/:programId/daily-cost', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;
    const { dailyCost } = req.body;

    if (dailyCost === undefined || dailyCost < 0) {
      return res.status(400).json({ error: 'Valid daily cost is required' });
    }

    // Verify program ownership
    const programCheck = await pool.query(
      'SELECT id FROM recovery_programs WHERE id = $1 AND user_id = $2',
      [programId, req.user.id]
    );

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Update daily cost
    const updateQuery = `
      UPDATE recovery_programs 
      SET daily_cost = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [dailyCost, programId, req.user.id]);

    // Recalculate and log new savings
    await this.recalculateSavings(req.user.id, programId);

    res.json({
      message: 'Daily cost updated successfully',
      program: result.rows[0]
    });

  } catch (error) {
    console.error('Update daily cost error:', error);
    res.status(500).json({ error: 'Failed to update daily cost' });
  }
});

// Log manual money saved entry
router.post('/log-savings', authenticateToken, async (req, res) => {
  try {
    const {
      programId,
      amount,
      calculationMethod = 'manual',
      notes,
      savedDate = new Date()
    } = req.body;

    if (!programId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Program ID and amount are required' });
    }

    // Verify program ownership
    const programCheck = await pool.query(
      'SELECT daily_cost FROM recovery_programs WHERE id = $1 AND user_id = $2',
      [programId, req.user.id]
    );

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const dailyCost = parseFloat(programCheck.rows[0].daily_cost || 0);

    // Insert savings log
    const insertQuery = `
      INSERT INTO money_saved_log (
        user_id, program_id, amount_saved, calculation_method,
        daily_cost, notes, saved_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      req.user.id,
      programId,
      amount,
      calculationMethod,
      dailyCost,
      notes,
      savedDate
    ]);

    // Update user's total money saved
    await pool.query(
      'UPDATE users SET total_money_saved = COALESCE(total_money_saved, 0) + $1 WHERE id = $2',
      [amount, req.user.id]
    );

    res.status(201).json({
      message: 'Savings logged successfully',
      savedEntry: result.rows[0]
    });

  } catch (error) {
    console.error('Log savings error:', error);
    res.status(500).json({ error: 'Failed to log savings' });
  }
});

// Get financial projections
router.get('/projections/:programId', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;
    const { timeframe = '1_year' } = req.query;

    // Get program data
    const programQuery = `
      SELECT 
        rp.*,
        at.name as addiction_type,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400 AS total_days
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.id = $1 AND rp.user_id = $2
    `;

    const program = await pool.query(programQuery, [programId, req.user.id]);

    if (program.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const programData = program.rows[0];
    const dailyCost = parseFloat(programData.daily_cost || 0);
    const currentDays = Math.floor(programData.total_days);

    // Calculate projections for different timeframes
    const projections = this.calculateDetailedProjections(dailyCost, currentDays, timeframe);

    // Calculate what they could buy with saved money
    const purchaseAlternatives = this.generatePurchaseAlternatives(projections.totalProjected);

    res.json({
      program: {
        id: programData.id,
        name: programData.program_name,
        addictionType: programData.addiction_type,
        dailyCost: dailyCost,
        currentDays: currentDays,
        currentSaved: dailyCost * currentDays
      },
      projections: projections,
      purchaseAlternatives: purchaseAlternatives,
      motivationalMessages: this.generateMotivationalMessages(projections.totalProjected, programData.addiction_type),
      timeframe: timeframe
    });

  } catch (error) {
    console.error('Financial projections error:', error);
    res.status(500).json({ error: 'Failed to calculate projections' });
  }
});

// Get savings goals and challenges
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    // Get user's current total savings
    const totalQuery = `
      SELECT 
        COALESCE(SUM(amount_saved), 0) as total_saved,
        COUNT(*) as log_count
      FROM money_saved_log 
      WHERE user_id = $1
    `;

    const totalResult = await pool.query(totalQuery, [req.user.id]);
    const totalSaved = parseFloat(totalResult.rows[0].total_saved);

    // Define savings milestones
    const milestones = [
      { amount: 50, title: 'First $50 Saved', description: 'A great start to your financial recovery!' },
      { amount: 100, title: 'Century Club', description: 'You\'ve saved your first $100!' },
      { amount: 250, title: 'Quarter Grand', description: 'Amazing progress - $250 saved!' },
      { amount: 500, title: 'Half Grand Hero', description: 'Incredible! You\'ve saved $500!' },
      { amount: 1000, title: 'Thousand Dollar Triumph', description: 'Outstanding achievement - $1000 saved!' },
      { amount: 2500, title: 'Financial Freedom Fighter', description: 'Exceptional progress - $2500 saved!' },
      { amount: 5000, title: 'Five Thousand Champion', description: 'Remarkable dedication - $5000 saved!' },
      { amount: 10000, title: 'Ten Thousand Legend', description: 'Legendary achievement - $10,000 saved!' }
    ];

    const completedMilestones = milestones.filter(m => totalSaved >= m.amount);
    const nextMilestone = milestones.find(m => totalSaved < m.amount);

    // Calculate daily, weekly, monthly goals
    const goals = {
      currentSavings: totalSaved,
      milestones: {
        completed: completedMilestones,
        next: nextMilestone,
        progressToNext: nextMilestone ? ((totalSaved / nextMilestone.amount) * 100) : 100
      },
      challenges: this.generateSavingschallenges(totalSaved),
      achievements: completedMilestones.length,
      insights: this.generateSavingsInsights(totalSaved, totalResult.rows[0].log_count)
    };

    res.json(goals);

  } catch (error) {
    console.error('Financial goals error:', error);
    res.status(500).json({ error: 'Failed to load financial goals' });
  }
});

// Helper methods
router.calculateProjections = function(dailyCost, currentDays) {
  return {
    oneWeek: dailyCost * 7,
    twoWeeks: dailyCost * 14,
    oneMonth: dailyCost * 30,
    threeMonths: dailyCost * 90,
    sixMonths: dailyCost * 180,
    oneYear: dailyCost * 365,
    current: dailyCost * currentDays
  };
};

router.calculateDetailedProjections = function(dailyCost, currentDays, timeframe) {
  const timeframes = {
    '1_week': 7,
    '1_month': 30,
    '3_months': 90,
    '6_months': 180,
    '1_year': 365,
    '5_years': 1825
  };

  const days = timeframes[timeframe] || 365;
  const additionalDays = Math.max(0, days - currentDays);

  return {
    currentSaved: dailyCost * currentDays,
    projectedAdditional: dailyCost * additionalDays,
    totalProjected: dailyCost * days,
    timeframeDays: days,
    additionalDays: additionalDays,
    projectionDate: new Date(Date.now() + additionalDays * 24 * 60 * 60 * 1000)
  };
};

router.generatePurchaseAlternatives = function(amount) {
  const alternatives = [
    { item: 'Coffee for a year', cost: 1825, description: 'Daily coffee shop visits' },
    { item: 'Gym membership (1 year)', cost: 600, description: 'Invest in your health' },
    { item: 'Vacation fund', cost: 1500, description: 'Weekend getaway' },
    { item: 'Emergency fund', cost: 1000, description: 'Financial security' },
    { item: 'Course or certification', cost: 500, description: 'Invest in your skills' },
    { item: 'Home improvement', cost: 2000, description: 'Make your space better' },
    { item: 'Technology upgrade', cost: 800, description: 'New laptop or phone' },
    { item: 'Wardrobe refresh', cost: 400, description: 'New clothes that fit your new life' }
  ];

  return alternatives
    .filter(alt => amount >= alt.cost)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
};

router.generateMotivationalMessages = function(amount, addictionType) {
  const messages = [
    `You've saved $${amount.toFixed(2)} by overcoming ${addictionType}!`,
    `Your recovery is literally paying off - $${amount.toFixed(2)} and counting!`,
    `Financial freedom and personal freedom go hand in hand.`,
    `Every day clean is money in the bank - you're building wealth!`,
    `Your future self will thank you for both the money saved and the life changed.`
  ];

  return messages;
};

router.calculateFinancialAchievements = function(totalSaved, programBreakdowns) {
  const achievements = [];

  if (totalSaved >= 50) achievements.push({ name: 'First $50', icon: '💵' });
  if (totalSaved >= 100) achievements.push({ name: 'Century Club', icon: '💰' });
  if (totalSaved >= 500) achievements.push({ name: 'Big Saver', icon: '🏦' });
  if (totalSaved >= 1000) achievements.push({ name: 'Thousand Saved', icon: '💎' });

  // Check for consistent tracking
  const trackingDays = programBreakdowns.reduce((sum, p) => sum + p.totalDays, 0);
  if (trackingDays >= 30) achievements.push({ name: 'Month Tracker', icon: '📊' });
  if (trackingDays >= 90) achievements.push({ name: 'Quarter Tracker', icon: '📈' });

  return achievements;
};

router.generateFinancialInsights = function(totalSaved, programBreakdowns) {
  const insights = [];

  if (totalSaved > 0) {
    insights.push(`You've saved $${totalSaved.toFixed(2)} through your recovery journey!`);
  }

  const totalDays = programBreakdowns.reduce((sum, p) => sum + p.totalDays, 0);
  if (totalDays > 0) {
    const avgDaily = totalSaved / totalDays;
    insights.push(`You're saving an average of $${avgDaily.toFixed(2)} per day.`);
  }

  if (programBreakdowns.length > 1) {
    const topSaver = programBreakdowns.reduce((max, p) => p.totalSaved > max.totalSaved ? p : max);
    insights.push(`Your biggest savings come from overcoming ${topSaver.addictionType}.`);
  }

  return insights;
};

router.generateMotivationalGoals = function(totalSaved, programBreakdowns) {
  const goals = [];

  // Next milestone goal
  const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
  const nextMilestone = milestones.find(m => totalSaved < m);
  
  if (nextMilestone) {
    const remaining = nextMilestone - totalSaved;
    goals.push({
      type: 'milestone',
      title: `Reach $${nextMilestone}`,
      progress: (totalSaved / nextMilestone) * 100,
      remaining: remaining,
      description: `Just $${remaining.toFixed(2)} more to your next milestone!`
    });
  }

  // Annual goal
  const avgDaily = programBreakdowns.reduce((sum, p) => sum + p.dailyCost, 0);
  if (avgDaily > 0) {
    const yearlyProjection = avgDaily * 365;
    goals.push({
      type: 'annual',
      title: 'Annual Savings Goal',
      projection: yearlyProjection,
      description: `At your current rate, you'll save $${yearlyProjection.toFixed(2)} this year!`
    });
  }

  return goals;
};

router.generateSavingsChallenges = function(totalSaved) {
  const challenges = [];

  challenges.push({
    title: 'Track for 7 Days',
    description: 'Log your savings for 7 consecutive days',
    difficulty: 'easy',
    reward: '$10 milestone recognition'
  });

  challenges.push({
    title: 'Set Daily Cost Goals',
    description: 'Set realistic daily cost estimates for all your programs',
    difficulty: 'medium',
    reward: 'Accurate projections'
  });

  if (totalSaved >= 100) {
    challenges.push({
      title: 'Investment Planning',
      description: 'Research what to do with your saved money',
      difficulty: 'hard',
      reward: 'Financial growth opportunities'
    });
  }

  return challenges;
};

router.generateSavingsInsights = function(totalSaved, logCount) {
  const insights = [];

  if (totalSaved > 0) {
    insights.push(`Total saved: $${totalSaved.toFixed(2)} across ${logCount} logged entries.`);
  }

  if (logCount >= 30) {
    insights.push('Great consistency! You\'re actively tracking your financial progress.');
  }

  if (totalSaved >= 1000) {
    insights.push('You\'ve proven that recovery pays - literally and figuratively!');
  }

  return insights;
};

router.recalculateSavings = async function(userId, programId) {
  // This would recalculate savings based on updated daily costs
  // Implementation depends on business logic for handling cost changes
};

module.exports = router;