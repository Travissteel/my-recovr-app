const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;

    const params = [req.user.id];

    if (unreadOnly === 'true') {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC`;

    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get unread count
    const unreadQuery = 'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false';
    const unreadResult = await pool.query(unreadQuery, [req.user.id]);

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadResult.rows[0].unread_count),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;