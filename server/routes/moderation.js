const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { Authorization, requireModerator, requireAdmin } = require('../middleware/authorization');
const SecurityAudit = require('../utils/securityAudit');

const router = express.Router();

// Input validation for moderation endpoints
const validateModerationInput = Authorization.validateInput({
  period: {
    allowedValues: ['1h', '24h', '7d', '30d', '90d'],
    required: false
  },
  page: {
    type: 'string',
    pattern: /^\d+$/,
    required: false
  },
  limit: {
    type: 'string', 
    pattern: /^\d+$/,
    required: false
  },
  status: {
    allowedValues: ['pending', 'in_progress', 'completed', 'all'],
    required: false
  },
  priority: {
    allowedValues: ['1', '2', '3', '4', '5', 'all'],
    required: false
  }
});

// Get moderation dashboard statistics
router.get('/dashboard-stats', 
  authenticateToken, 
  requireModerator, 
  validateModerationInput,
  async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Create secure date filter with parameterized query
    const dateFilter = Authorization.createDateFilter(period);
    
    // Log access to dashboard stats
    await SecurityAudit.logDataAccess(req, 'moderation_dashboard_stats');

    // Get pending moderation queue items
    const queueStatsQuery = `
      SELECT 
        COUNT(*) as total_pending,
        COUNT(CASE WHEN priority >= 4 THEN 1 END) as high_priority,
        COUNT(CASE WHEN item_type = 'message' THEN 1 END) as pending_messages,
        COUNT(CASE WHEN item_type = 'post' THEN 1 END) as pending_posts,
        COUNT(CASE WHEN item_type = 'user_report' THEN 1 END) as pending_reports
      FROM moderation_queue 
      WHERE status = 'pending'
    `;

    const queueStats = await pool.query(queueStatsQuery);

    // Get safety violation trends - SECURE with parameterized query
    const violationTrendsQuery = `
      SELECT 
        violation_type,
        severity_level,
        COUNT(*) as count,
        AVG(CASE WHEN action_taken = 'blocked' THEN 1 ELSE 0 END) as block_rate
      FROM message_safety_logs 
      WHERE ${dateFilter.whereClause}
      GROUP BY violation_type, severity_level
      ORDER BY count DESC
    `;

    const violationTrends = await pool.query(violationTrendsQuery, [dateFilter.parameter]);

    // Get moderation actions summary - SECURE with parameterized query
    const actionsSummaryQuery = `
      SELECT 
        action_type,
        COUNT(*) as count,
        COUNT(CASE WHEN automated = true THEN 1 END) as automated_count
      FROM moderation_actions 
      WHERE ${dateFilter.whereClause}
      GROUP BY action_type
      ORDER BY count DESC
    `;

    const actionsSummary = await pool.query(actionsSummaryQuery, [dateFilter.parameter]);

    // Get crisis posts requiring attention - SECURE fixed interval
    const crisisPostsQuery = `
      SELECT COUNT(*) as high_priority_crisis
      FROM crisis_support_posts 
      WHERE crisis_level >= $1 AND is_resolved = false
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `;

    const crisisPosts = await pool.query(crisisPostsQuery, [4]);

    // Get user warnings summary - SECURE with parameterized query
    const warningsQuery = `
      SELECT 
        warning_type,
        severity,
        COUNT(*) as count
      FROM user_warnings 
      WHERE ${dateFilter.whereClause}
      GROUP BY warning_type, severity
      ORDER BY count DESC
    `;

    const warnings = await pool.query(warningsQuery, [dateFilter.parameter]);

    res.json({
      period,
      queueStats: queueStats.rows[0],
      violationTrends: violationTrends.rows,
      actionsSummary: actionsSummary.rows,
      highPriorityCrisis: parseInt(crisisPosts.rows[0].high_priority_crisis),
      warnings: warnings.rows
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get moderation queue items
router.get('/queue', 
  authenticateToken, 
  requireModerator, 
  validateModerationInput,
  async (req, res) => {
  try {
    const { 
      status = 'pending', 
      itemType, 
      priority, 
      assignedToMe = false,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = `
      SELECT mq.*, 
             CASE 
               WHEN mq.item_type = 'message' THEN (
                 SELECT jsonb_build_object(
                   'id', m.id,
                   'content', m.content,
                   'sender_name', u.first_name || ' ' || u.last_name,
                   'conversation_id', m.conversation_id,
                   'safety_score', m.safety_score,
                   'flagged_content', m.flagged_content
                 )
                 FROM messages m 
                 JOIN users u ON m.sender_id = u.id 
                 WHERE m.id = mq.item_id
               )
               WHEN mq.item_type = 'post' THEN (
                 SELECT jsonb_build_object(
                   'id', cp.id,
                   'title', cp.title,
                   'content', cp.content,
                   'post_type', cp.post_type
                 )
                 FROM community_posts cp 
                 WHERE cp.id = mq.item_id
               )
               WHEN mq.item_type = 'user_report' THEN (
                 SELECT jsonb_build_object(
                   'id', mr.id,
                   'report_type', mr.report_type,
                   'description', mr.description,
                   'reported_by', u.first_name || ' ' || u.last_name
                 )
                 FROM message_reports mr 
                 JOIN users u ON mr.reported_by = u.id 
                 WHERE mr.id = mq.item_id
               )
             END as item_details,
             assigned_user.first_name || ' ' || assigned_user.last_name as assigned_to_name
      FROM moderation_queue mq
      LEFT JOIN users assigned_user ON mq.assigned_to = assigned_user.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ` AND mq.status = $${params.length + 1}`;
      params.push(status);
    }

    if (itemType) {
      query += ` AND mq.item_type = $${params.length + 1}`;
      params.push(itemType);
    }

    if (priority) {
      query += ` AND mq.priority >= $${params.length + 1}`;
      params.push(priority);
    }

    if (assignedToMe === 'true') {
      query += ` AND mq.assigned_to = $${params.length + 1}`;
      params.push(req.user.id);
    }

    query += ` ORDER BY mq.priority DESC, mq.created_at ASC`;

    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      queueItems: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get moderation queue error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation queue' });
  }
});

// Assign queue item to moderator
router.post('/queue/:itemId/assign', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { assignToId } = req.body;

    const assignTo = assignToId || req.user.id;

    const result = await pool.query(
      `UPDATE moderation_queue 
       SET assigned_to = $1, status = 'in_review', reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [assignTo, itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Queue item not found or already assigned'
      });
    }

    res.json({
      message: 'Queue item assigned successfully',
      queueItem: result.rows[0]
    });

  } catch (error) {
    console.error('Assign queue item error:', error);
    res.status(500).json({ error: 'Failed to assign queue item' });
  }
});

// Take moderation action
router.post('/actions', authenticateToken, requireModerator, async (req, res) => {
  try {
    const {
      targetType,
      targetId,
      actionType,
      reason,
      durationHours,
      notes,
      queueItemId
    } = req.body;

    if (!targetType || !targetId || !actionType || !reason) {
      return res.status(400).json({
        error: 'Target type, target ID, action type, and reason are required'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Record the moderation action
      const actionQuery = `
        INSERT INTO moderation_actions (
          moderator_id, target_type, target_id, action_type, 
          reason, duration_hours, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const actionResult = await client.query(actionQuery, [
        req.user.id,
        targetType,
        targetId,
        actionType,
        reason,
        durationHours,
        notes
      ]);

      // Apply the action based on type
      switch (actionType) {
        case 'delete_content':
          if (targetType === 'message') {
            await client.query(
              'UPDATE messages SET is_deleted = true WHERE id = $1',
              [targetId]
            );
          } else if (targetType === 'post') {
            await client.query(
              'UPDATE community_posts SET is_deleted = true WHERE id = $1',
              [targetId]
            );
          }
          break;

        case 'ban':
        case 'mute':
          // Get user ID based on target
          let userId = targetId;
          if (targetType === 'message') {
            const messageResult = await client.query(
              'SELECT sender_id FROM messages WHERE id = $1',
              [targetId]
            );
            if (messageResult.rows.length > 0) {
              userId = messageResult.rows[0].sender_id;
            }
          }

          // Apply user restriction
          const restrictionType = actionType === 'ban' ? 'banned' : 'temporary_mute';
          const restrictedUntil = durationHours ? 
            new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;

          await client.query(
            `INSERT INTO user_messaging_restrictions (
              user_id, restriction_type, reason, restricted_until, 
              is_permanent, applied_by
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              userId,
              restrictionType,
              reason,
              restrictedUntil,
              !durationHours,
              req.user.id
            ]
          );
          break;

        case 'warn':
          // Issue warning to user
          let warnUserId = targetId;
          if (targetType === 'message') {
            const messageResult = await client.query(
              'SELECT sender_id FROM messages WHERE id = $1',
              [targetId]
            );
            if (messageResult.rows.length > 0) {
              warnUserId = messageResult.rows[0].sender_id;
            }
          }

          await client.query(
            `INSERT INTO user_warnings (
              user_id, warning_type, description, issued_by, severity
            ) VALUES ($1, $2, $3, $4, $5)`,
            [warnUserId, 'behavior_warning', reason, req.user.id, 3]
          );
          break;

        case 'approve_content':
          if (targetType === 'message') {
            await client.query(
              'UPDATE messages SET moderation_status = $1 WHERE id = $2',
              ['approved', targetId]
            );
          }
          break;
      }

      // Resolve queue item if provided
      if (queueItemId) {
        await client.query(
          `UPDATE moderation_queue 
           SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [queueItemId]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Moderation action taken successfully',
        action: actionResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Moderation action error:', error);
    res.status(500).json({ error: 'Failed to take moderation action' });
  }
});

// Get user moderation history
router.get('/users/:userId/history', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Get user's violation history
    const violationsQuery = `
      SELECT msl.*, m.content as message_content, m.created_at as message_date
      FROM message_safety_logs msl
      LEFT JOIN messages m ON msl.message_id = m.id
      WHERE msl.user_id = $1
      ORDER BY msl.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const offset = (page - 1) * limit;
    const violations = await pool.query(violationsQuery, [userId, limit, offset]);

    // Get moderation actions taken against user
    const actionsQuery = `
      SELECT ma.*, moderator.first_name || ' ' || moderator.last_name as moderator_name
      FROM moderation_actions ma
      JOIN users moderator ON ma.moderator_id = moderator.id
      WHERE ma.target_id = $1 OR (
        ma.target_type = 'message' AND ma.target_id IN (
          SELECT id FROM messages WHERE sender_id = $1
        )
      )
      ORDER BY ma.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const actions = await pool.query(actionsQuery, [userId, limit, offset]);

    // Get active restrictions
    const restrictionsQuery = `
      SELECT * FROM user_messaging_restrictions 
      WHERE user_id = $1 
      AND (is_permanent = true OR restricted_until > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
    `;

    const restrictions = await pool.query(restrictionsQuery, [userId]);

    // Get warnings
    const warningsQuery = `
      SELECT uw.*, issuer.first_name || ' ' || issuer.last_name as issuer_name
      FROM user_warnings uw
      JOIN users issuer ON uw.issued_by = issuer.id
      WHERE uw.user_id = $1
      ORDER BY uw.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const warnings = await pool.query(warningsQuery, [userId, limit, offset]);

    res.json({
      violations: violations.rows,
      actions: actions.rows,
      activeRestrictions: restrictions.rows,
      warnings: warnings.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({ error: 'Failed to fetch user moderation history' });
  }
});

// Get flagged content requiring review
router.get('/flagged-content', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { contentType = 'message', page = 1, limit = 20 } = req.query;

    if (contentType === 'message') {
      const query = `
        SELECT m.*, 
               u.first_name || ' ' || u.last_name as sender_name,
               u.username as sender_username,
               c.conversation_type
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        JOIN conversations c ON m.conversation_id = c.id
        WHERE m.moderation_status = 'flagged' 
        AND m.is_deleted = false
        ORDER BY m.safety_score ASC, m.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const offset = (page - 1) * limit;
      const result = await pool.query(query, [limit, offset]);

      res.json({
        flaggedContent: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } else {
      // Handle other content types (posts, comments) similarly
      res.json({ flaggedContent: [], pagination: { page: 1, limit } });
    }

  } catch (error) {
    console.error('Get flagged content error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged content' });
  }
});

// Update flagged terms
router.post('/flagged-terms', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { term, category, severity, isRegex = false } = req.body;

    if (!term || !category || !severity) {
      return res.status(400).json({
        error: 'Term, category, and severity are required'
      });
    }

    const query = `
      INSERT INTO flagged_terms (term, category, severity, is_regex)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (term) DO UPDATE SET
        category = $2,
        severity = $3,
        is_regex = $4,
        is_active = true
      RETURNING *
    `;

    const result = await pool.query(query, [term, category, severity, isRegex]);

    res.status(201).json({
      message: 'Flagged term updated successfully',
      flaggedTerm: result.rows[0]
    });

  } catch (error) {
    console.error('Update flagged term error:', error);
    res.status(500).json({ error: 'Failed to update flagged term' });
  }
});

// Get platform health metrics
router.get('/platform-health', authenticateToken, requireModerator, async (req, res) => {
  try {
    const healthQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_active_users,
        (SELECT COUNT(*) FROM users WHERE last_login >= NOW() - INTERVAL '24 hours') as daily_active_users,
        (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours') as messages_24h,
        (SELECT COUNT(*) FROM messages WHERE is_blocked = true AND created_at >= NOW() - INTERVAL '24 hours') as blocked_messages_24h,
        (SELECT COUNT(*) FROM crisis_support_posts WHERE crisis_level >= 4 AND is_resolved = false) as active_crisis_posts,
        (SELECT COUNT(*) FROM moderation_queue WHERE status = 'pending') as pending_reviews,
        (SELECT COUNT(*) FROM user_messaging_restrictions WHERE 
          is_permanent = true OR restricted_until > CURRENT_TIMESTAMP) as restricted_users
    `;

    const result = await pool.query(healthQuery);
    const metrics = result.rows[0];

    // Calculate health score (0-100)
    const blockedMessageRate = metrics.messages_24h > 0 ? 
      (metrics.blocked_messages_24h / metrics.messages_24h) * 100 : 0;
    
    const healthScore = Math.max(0, 100 - 
      (blockedMessageRate * 2) - 
      (metrics.pending_reviews * 0.5) - 
      (metrics.active_crisis_posts * 5)
    );

    res.json({
      metrics: {
        ...metrics,
        blocked_message_rate: parseFloat(blockedMessageRate.toFixed(2)),
        health_score: Math.round(healthScore)
      }
    });

  } catch (error) {
    console.error('Platform health error:', error);
    res.status(500).json({ error: 'Failed to fetch platform health metrics' });
  }
});

module.exports = router;