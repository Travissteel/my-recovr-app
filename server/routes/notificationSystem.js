const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

/**
 * Notification System Routes
 * Customizable motivational notifications and reminders for recovery support
 */

// Get user's notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    // Get user's current notification settings
    const userQuery = `
      SELECT preferences
      FROM users 
      WHERE id = $1
    `;

    const user = await pool.query(userQuery, [req.user.id]);
    const currentPrefs = user.rows[0]?.preferences?.notifications || {};

    // Default notification preferences
    const defaultPreferences = {
      dailyMotivation: {
        enabled: true,
        time: '09:00',
        frequency: 'daily',
        type: 'push'
      },
      streakReminders: {
        enabled: true,
        streakMilestones: [1, 7, 14, 30, 90, 180, 365],
        celebrateAchievements: true
      },
      cravingSupport: {
        enabled: true,
        emergencyButton: true,
        quickAccess: true,
        immediateResponse: true
      },
      checkInReminders: {
        enabled: true,
        time: '20:00',
        skipWeekends: false,
        customMessage: true
      },
      challengeNotifications: {
        enabled: true,
        newChallenges: true,
        completionReminders: true,
        weeklyGoals: true
      },
      communityUpdates: {
        enabled: false,
        supportRequests: false,
        milestoneSharing: false,
        privateMentions: true
      },
      healthBenefits: {
        enabled: true,
        timeline: true,
        educationalContent: true,
        scientificFacts: true
      },
      financialUpdates: {
        enabled: true,
        monthlySummary: true,
        savingsGoals: true,
        milestoneAlerts: true
      }
    };

    // Merge with user's existing preferences
    const preferences = { ...defaultPreferences, ...currentPrefs };

    res.json({
      preferences: preferences,
      availableTypes: ['push', 'email', 'sms', 'in_app'],
      availableFrequencies: ['daily', 'weekly', 'bi_weekly', 'monthly'],
      customizationOptions: this.getCustomizationOptions()
    });

  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ error: 'Failed to load notification preferences' });
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Valid preferences object required' });
    }

    // Get current user preferences
    const currentQuery = `
      SELECT preferences FROM users WHERE id = $1
    `;
    const currentResult = await pool.query(currentQuery, [req.user.id]);
    const currentPrefs = currentResult.rows[0]?.preferences || {};

    // Update notification preferences
    const updatedPrefs = {
      ...currentPrefs,
      notifications: {
        ...currentPrefs.notifications,
        ...preferences
      }
    };

    const updateQuery = `
      UPDATE users 
      SET preferences = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING preferences
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(updatedPrefs),
      req.user.id
    ]);

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: result.rows[0].preferences.notifications
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Get user's notification history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;

    let query = `
      SELECT id, title, message, notification_type, is_read, 
             action_url, created_at
      FROM notifications 
      WHERE user_id = $1
    `;
    
    const params = [req.user.id];

    if (type) {
      query += ' AND notification_type = $2';
      params.push(type);
    }

    query += ` 
      ORDER BY created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const notifications = await pool.query(query, params);

    // Get unread count
    const unreadQuery = `
      SELECT COUNT(*) as unread_count
      FROM notifications 
      WHERE user_id = $1 AND is_read = false
    `;
    const unreadResult = await pool.query(unreadQuery, [req.user.id]);

    res.json({
      notifications: notifications.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: notifications.rows.length
      },
      unreadCount: parseInt(unreadResult.rows[0].unread_count)
    });

  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({ error: 'Failed to load notification history' });
  }
});

// Mark notifications as read
router.put('/mark-read', authenticateToken, async (req, res) => {
  try {
    const { notificationIds, markAll = false } = req.body;

    let query;
    let params;

    if (markAll) {
      query = `
        UPDATE notifications 
        SET is_read = true 
        WHERE user_id = $1 AND is_read = false
        RETURNING id
      `;
      params = [req.user.id];
    } else {
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({ error: 'Notification IDs required' });
      }

      query = `
        UPDATE notifications 
        SET is_read = true 
        WHERE user_id = $1 AND id = ANY($2::uuid[])
        RETURNING id
      `;
      params = [req.user.id, notificationIds];
    }

    const result = await pool.query(query, params);

    res.json({
      message: `Marked ${result.rows.length} notifications as read`,
      updatedCount: result.rows.length
    });

  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Send test notification
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { type = 'motivation', message } = req.body;

    const testMessage = message || this.getTestMessage(type);
    
    // Create test notification
    const insertQuery = `
      INSERT INTO notifications (user_id, title, message, notification_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      req.user.id,
      'Test Notification',
      testMessage,
      'system'
    ]);

    res.status(201).json({
      message: 'Test notification sent successfully',
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Get suggested notification schedules
router.get('/suggested-schedules', authenticateToken, async (req, res) => {
  try {
    // Get user's recovery programs to suggest optimal timing
    const programsQuery = `
      SELECT rp.*, at.name as addiction_type
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.user_id = $1 AND rp.status = 'active'
    `;

    const programs = await pool.query(programsQuery, [req.user.id]);

    // Get user's check-in patterns
    const checkinPatternsQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as checkin_count
      FROM daily_checkins 
      WHERE user_id = $1 
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY checkin_count DESC
      LIMIT 3
    `;

    const checkinPatterns = await pool.query(checkinPatternsQuery, [req.user.id]);

    const suggestedSchedules = this.generateSuggestedSchedules(
      programs.rows, 
      checkinPatterns.rows
    );

    res.json({
      schedules: suggestedSchedules,
      personalizationTips: this.getPersonalizationTips(programs.rows),
      optimalTimes: this.getOptimalNotificationTimes()
    });

  } catch (error) {
    console.error('Get suggested schedules error:', error);
    res.status(500).json({ error: 'Failed to load suggested schedules' });
  }
});

// Create custom notification template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const { name, title, message, triggers, schedule } = req.body;

    if (!name || !title || !message) {
      return res.status(400).json({ error: 'Name, title, and message are required' });
    }

    // Store custom template in user preferences
    const userQuery = `SELECT preferences FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [req.user.id]);
    const currentPrefs = userResult.rows[0]?.preferences || {};

    const customTemplates = currentPrefs.customNotificationTemplates || [];
    customTemplates.push({
      id: Date.now().toString(),
      name,
      title,
      message,
      triggers: triggers || [],
      schedule: schedule || {},
      createdAt: new Date().toISOString()
    });

    const updatedPrefs = {
      ...currentPrefs,
      customNotificationTemplates: customTemplates
    };

    const updateQuery = `
      UPDATE users 
      SET preferences = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING preferences
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(updatedPrefs),
      req.user.id
    ]);

    res.status(201).json({
      message: 'Custom notification template created successfully',
      template: customTemplates[customTemplates.length - 1]
    });

  } catch (error) {
    console.error('Create notification template error:', error);
    res.status(500).json({ error: 'Failed to create notification template' });
  }
});

// Get motivational content for notifications
router.get('/motivational-content', authenticateToken, async (req, res) => {
  try {
    const { category = 'all', type = 'all' } = req.query;

    // Get user's addiction types for personalization
    const addictionTypesQuery = `
      SELECT DISTINCT at.name 
      FROM recovery_programs rp
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE rp.user_id = $1 AND rp.status = 'active'
    `;

    const userAddictions = await pool.query(addictionTypesQuery, [req.user.id]);
    const addictionTypes = userAddictions.rows.map(row => row.name);

    let contentQuery = `
      SELECT content_type, title, content, author, category
      FROM motivational_content 
      WHERE is_active = true
    `;

    const params = [];

    if (category !== 'all') {
      contentQuery += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    if (type !== 'all') {
      contentQuery += ` AND content_type = $${params.length + 1}`;
      params.push(type);
    }

    // Prioritize content relevant to user's addictions
    if (addictionTypes.length > 0) {
      contentQuery += ` AND (addiction_types = '[]' OR addiction_types ?| $${params.length + 1})`;
      params.push(addictionTypes);
    }

    contentQuery += ` ORDER BY RANDOM() LIMIT 20`;

    const content = await pool.query(contentQuery, params);

    // Generate personalized notifications
    const personalizedNotifications = this.generatePersonalizedNotifications(
      content.rows,
      addictionTypes
    );

    res.json({
      content: content.rows,
      personalizedNotifications: personalizedNotifications,
      categories: ['recovery', 'motivation', 'mindfulness', 'self_worth', 'brain_health'],
      types: ['quote', 'tip', 'fact', 'affirmation']
    });

  } catch (error) {
    console.error('Get motivational content error:', error);
    res.status(500).json({ error: 'Failed to load motivational content' });
  }
});

// Helper methods
router.getCustomizationOptions = function() {
  return {
    messageTypes: [
      { key: 'encouraging', label: 'Encouraging & Supportive' },
      { key: 'scientific', label: 'Scientific & Educational' },
      { key: 'spiritual', label: 'Spiritual & Reflective' },
      { key: 'practical', label: 'Practical & Action-Oriented' },
      { key: 'humorous', label: 'Light & Humorous' }
    ],
    frequencies: [
      { key: 'multiple_daily', label: 'Multiple times per day' },
      { key: 'daily', label: 'Once daily' },
      { key: 'every_other_day', label: 'Every other day' },
      { key: 'weekly', label: 'Weekly' },
      { key: 'milestone_only', label: 'Milestones only' }
    ],
    timingOptions: [
      { key: 'morning', label: 'Morning motivation (7-10 AM)' },
      { key: 'midday', label: 'Midday check-in (12-2 PM)' },
      { key: 'evening', label: 'Evening reflection (6-9 PM)' },
      { key: 'custom', label: 'Custom times' }
    ]
  };
};

router.getTestMessage = function(type) {
  const messages = {
    motivation: "🌟 You're doing amazing! Every moment of recovery is a victory worth celebrating.",
    streak: "🔥 Your recovery streak is proof of your incredible strength and determination!",
    craving: "💪 This feeling will pass. You've overcome this before, and you can do it again.",
    achievement: "🏆 New achievement unlocked! Your progress is inspiring.",
    health: "🧠 Your brain is healing and rewiring itself with every day of recovery.",
    financial: "💰 Your recovery is literally paying off - financially and personally!"
  };
  return messages[type] || messages.motivation;
};

router.generateSuggestedSchedules = function(programs, checkinPatterns) {
  const schedules = [
    {
      name: 'Morning Motivation',
      description: 'Start each day with encouragement',
      times: ['08:00'],
      frequency: 'daily',
      type: 'motivation'
    },
    {
      name: 'Evening Reflection',
      description: 'End your day with gratitude and reflection',
      times: ['20:00'],
      frequency: 'daily',
      type: 'reflection'
    },
    {
      name: 'Craving Support',
      description: 'Quick access when you need it most',
      times: [], // On-demand
      frequency: 'as_needed',
      type: 'crisis_support'
    }
  ];

  // Personalize based on check-in patterns
  if (checkinPatterns.length > 0) {
    const mostActiveHour = checkinPatterns[0].hour;
    schedules.push({
      name: 'Personal Best Time',
      description: `Based on your most active time (${mostActiveHour}:00)`,
      times: [`${mostActiveHour}:00`],
      frequency: 'daily',
      type: 'personalized'
    });
  }

  return schedules;
};

router.getPersonalizationTips = function(programs) {
  const tips = [
    'Set notifications for times when you typically feel most motivated',
    'Consider your daily routine and when you check your phone most',
    'Start with fewer notifications and gradually adjust',
    'Use different types of messages for different times of day'
  ];

  if (programs.length > 1) {
    tips.push('Consider different notification styles for different addiction types');
  }

  return tips;
};

router.getOptimalNotificationTimes = function() {
  return {
    morning: {
      time: '08:00-10:00',
      purpose: 'Daily motivation and goal setting',
      effectiveness: 'High for motivation and planning'
    },
    midday: {
      time: '12:00-14:00',
      purpose: 'Check-in reminders and encouragement',
      effectiveness: 'Good for maintaining awareness'
    },
    evening: {
      time: '18:00-21:00',
      purpose: 'Reflection and gratitude',
      effectiveness: 'High for consolidating progress'
    },
    avoid: {
      times: ['Late night (after 22:00)', 'Very early morning (before 7:00)'],
      reason: 'May disrupt sleep patterns'
    }
  };
};

router.generatePersonalizedNotifications = function(content, addictionTypes) {
  return content.slice(0, 5).map(item => ({
    title: this.personalizeTitle(item.title, addictionTypes),
    message: this.personalizeMessage(item.content, addictionTypes),
    category: item.category,
    type: item.content_type
  }));
};

router.personalizeTitle = function(title, addictionTypes) {
  // Simple personalization - could be enhanced with more sophisticated logic
  return title;
};

router.personalizeMessage = function(message, addictionTypes) {
  // Simple personalization - could be enhanced with more sophisticated logic
  return message;
};

module.exports = router;