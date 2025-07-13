const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { Authorization } = require('../middleware/authorization');
const SecurityAudit = require('../utils/securityAudit');

const router = express.Router();

// Get all content categories
router.get('/categories', async (req, res) => {
  try {
    const query = `
      SELECT id, name, description, category_type, default_keywords, 
             default_websites, icon, color
      FROM content_categories
      ORDER BY category_type, name
    `;
    
    const result = await pool.query(query);
    
    res.json({
      categories: result.rows
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch content categories' });
  }
});

// Get user's blocked content
router.get('/blocked-content', authenticateToken, async (req, res) => {
  try {
    const { contentType, isActive } = req.query;
    
    let query = `
      SELECT bc.*, cc.name as category_name, cc.color as category_color
      FROM blocked_content bc
      LEFT JOIN content_categories cc ON bc.content_value = cc.id::text
      WHERE bc.user_id = $1
    `;
    
    const params = [req.user.id];
    
    if (contentType) {
      query += ` AND bc.content_type = $${params.length + 1}`;
      params.push(contentType);
    }
    
    if (isActive !== undefined) {
      query += ` AND bc.is_active = $${params.length + 1}`;
      params.push(isActive === 'true');
    }
    
    query += ` ORDER BY bc.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      blockedContent: result.rows
    });
    
  } catch (error) {
    console.error('Get blocked content error:', error);
    res.status(500).json({ error: 'Failed to fetch blocked content' });
  }
});

// Add blocked content
router.post('/blocked-content', authenticateToken, async (req, res) => {
  try {
    const {
      contentType,
      contentValue,
      blockLevel = 'strict',
      schedule = { always: true }
    } = req.body;

    if (!contentType || !contentValue) {
      return res.status(400).json({
        error: 'Content type and value are required'
      });
    }

    if (!['website', 'app', 'keyword', 'category'].includes(contentType)) {
      return res.status(400).json({
        error: 'Invalid content type'
      });
    }

    // Check if already blocked
    const existingQuery = `
      SELECT id FROM blocked_content 
      WHERE user_id = $1 AND content_type = $2 AND content_value = $3
    `;
    
    const existingResult = await pool.query(existingQuery, [
      req.user.id, contentType, contentValue
    ]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Content is already blocked'
      });
    }

    const query = `
      INSERT INTO blocked_content (
        user_id, content_type, content_value, block_level, schedule
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [
      req.user.id,
      contentType,
      contentValue,
      blockLevel,
      JSON.stringify(schedule)
    ]);

    res.status(201).json({
      message: 'Content blocked successfully',
      blockedContent: result.rows[0]
    });

  } catch (error) {
    console.error('Add blocked content error:', error);
    res.status(500).json({ error: 'Failed to block content' });
  }
});

// Update blocked content
router.put('/blocked-content/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { blockLevel, schedule, isActive } = req.body;

    const query = `
      UPDATE blocked_content 
      SET block_level = COALESCE($1, block_level),
          schedule = COALESCE($2, schedule),
          is_active = COALESCE($3, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `;

    const result = await pool.query(query, [
      blockLevel,
      schedule ? JSON.stringify(schedule) : null,
      isActive,
      id,
      req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Blocked content not found'
      });
    }

    res.json({
      message: 'Blocked content updated successfully',
      blockedContent: result.rows[0]
    });

  } catch (error) {
    console.error('Update blocked content error:', error);
    res.status(500).json({ error: 'Failed to update blocked content' });
  }
});

// Delete blocked content
router.delete('/blocked-content/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM blocked_content WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Blocked content not found'
      });
    }

    res.json({
      message: 'Blocked content removed successfully'
    });

  } catch (error) {
    console.error('Delete blocked content error:', error);
    res.status(500).json({ error: 'Failed to remove blocked content' });
  }
});

// Start a blocking session
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const {
      sessionName,
      duration, // in minutes
      blockCategories = [],
      emergencyContacts = []
    } = req.body;

    const startTime = new Date();
    const endTime = duration ? new Date(startTime.getTime() + duration * 60000) : null;

    const query = `
      INSERT INTO block_sessions (
        user_id, session_name, start_time, end_time, 
        block_categories, emergency_contacts
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      req.user.id,
      sessionName,
      startTime,
      endTime,
      JSON.stringify(blockCategories),
      JSON.stringify(emergencyContacts)
    ]);

    res.status(201).json({
      message: 'Blocking session started',
      session: result.rows[0]
    });

  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start blocking session' });
  }
});

// Get active blocking sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT * FROM block_sessions 
      WHERE user_id = $1 AND is_active = true
      ORDER BY start_time DESC
    `;

    const result = await pool.query(query, [req.user.id]);

    res.json({
      sessions: result.rows
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch blocking sessions' });
  }
});

// End a blocking session
router.post('/sessions/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE block_sessions 
      SET is_active = false, end_time = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await pool.query(query, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Active session not found'
      });
    }

    res.json({
      message: 'Blocking session ended',
      session: result.rows[0]
    });

  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end blocking session' });
  }
});

// Check if content should be blocked
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { url, keywords = [] } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    // Extract domain from URL
    const domain = new URL(url).hostname.replace('www.', '');

    // Check blocked websites
    const websiteQuery = `
      SELECT bc.*, cc.name as category_name
      FROM blocked_content bc
      LEFT JOIN content_categories cc ON bc.content_value = cc.id::text
      WHERE bc.user_id = $1 AND bc.is_active = true 
      AND (bc.content_type = 'website' AND $2 LIKE '%' || bc.content_value || '%')
    `;

    const websiteResult = await pool.query(websiteQuery, [req.user.id, domain]);

    // Check blocked keywords
    const keywordQuery = `
      SELECT * FROM blocked_content 
      WHERE user_id = $1 AND content_type = 'keyword' AND is_active = true
    `;

    const keywordResult = await pool.query(keywordQuery, [req.user.id]);

    let blockedReason = null;
    let blockedBy = null;

    // Check website blocks
    if (websiteResult.rows.length > 0) {
      blockedBy = websiteResult.rows[0];
      blockedReason = `Website blocked: ${domain}`;
    }

    // Check keyword blocks
    if (!blockedReason) {
      for (const keywordBlock of keywordResult.rows) {
        for (const keyword of keywords) {
          if (keyword.toLowerCase().includes(keywordBlock.content_value.toLowerCase())) {
            blockedBy = keywordBlock;
            blockedReason = `Keyword blocked: ${keywordBlock.content_value}`;
            break;
          }
        }
        if (blockedReason) break;
      }
    }

    const isBlocked = !!blockedReason;

    // Log the attempt
    if (isBlocked && blockedBy) {
      await pool.query(
        `INSERT INTO block_attempts (
          user_id, blocked_content_id, attempted_url, attempt_type
        ) VALUES ($1, $2, $3, $4)`,
        [req.user.id, blockedBy.id, url, 'access']
      );

      // Update trigger count
      await pool.query(
        `UPDATE blocked_content 
         SET last_triggered_at = CURRENT_TIMESTAMP, 
             bypass_attempts = bypass_attempts + 1
         WHERE id = $1`,
        [blockedBy.id]
      );
    }

    res.json({
      isBlocked,
      reason: blockedReason,
      blockLevel: blockedBy?.block_level || null,
      allowBypass: blockedBy?.block_level === 'lenient'
    });

  } catch (error) {
    console.error('Check content error:', error);
    res.status(500).json({ error: 'Failed to check content' });
  }
});

// Input validation for blocker endpoints
const validateBlockerInput = Authorization.validateInput({
  period: {
    allowedValues: ['1h', '24h', '7d', '30d', '90d'],
    required: false
  },
  contentType: {
    allowedValues: ['website', 'keyword', 'category', 'app'],
    required: false
  },
  blockLevel: {
    allowedValues: ['lenient', 'moderate', 'strict'],
    required: false
  }
});

// Get blocking statistics - SECURED
router.get('/stats', 
  authenticateToken, 
  validateBlockerInput,
  async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Create secure date filter with parameterized query
    const dateFilter = Authorization.createDateFilter(period);
    
    // Log access to sensitive analytics data
    await SecurityAudit.logDataAccess(req, 'blocking_statistics');

    // Get block attempts - SECURE with parameterized query
    const attemptsQuery = `
      SELECT COUNT(*) as total_attempts,
             COUNT(CASE WHEN was_successful = false THEN 1 END) as blocks_effective
      FROM block_attempts 
      WHERE user_id = $1 AND ${dateFilter.whereClause}
    `;

    const attemptsResult = await pool.query(attemptsQuery, [req.user.id, dateFilter.parameter]);

    // Get most blocked content - SECURE with parameterized query
    const topBlockedQuery = `
      SELECT bc.content_value, bc.content_type, COUNT(ba.*) as block_count
      FROM blocked_content bc
      JOIN block_attempts ba ON bc.id = ba.blocked_content_id
      WHERE bc.user_id = $1 AND ${dateFilter.whereClause}
      GROUP BY bc.id, bc.content_value, bc.content_type
      ORDER BY block_count DESC
      LIMIT 5
    `;

    const topBlockedResult = await pool.query(topBlockedQuery, [req.user.id, dateFilter.parameter]);

    res.json({
      period,
      totalAttempts: parseInt(attemptsResult.rows[0].total_attempts),
      blocksEffective: parseInt(attemptsResult.rows[0].blocks_effective),
      topBlocked: topBlockedResult.rows
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch blocking statistics' });
  }
});

module.exports = router;