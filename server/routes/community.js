const express = require('express');
const pool = require('../database/connection');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all public community groups
router.get('/groups', optionalAuth, async (req, res) => {
  try {
    const { addictionType, search, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT cg.*, at.name as addiction_type_name, at.color as addiction_type_color,
             u.first_name as creator_first_name, u.last_name as creator_last_name,
             u.username as creator_username
      FROM community_groups cg
      LEFT JOIN addiction_types at ON cg.addiction_type_id = at.id
      JOIN users u ON cg.created_by = u.id
      WHERE cg.is_public = true
    `;
    
    const params = [];
    
    if (addictionType) {
      query += ` AND cg.addiction_type_id = $${params.length + 1}`;
      params.push(addictionType);
    }
    
    if (search) {
      query += ` AND (cg.name ILIKE $${params.length + 1} OR cg.description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY cg.member_count DESC, cg.created_at DESC`;
    
    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      groups: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch community groups' });
  }
});

// Create a new community group
router.post('/groups', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      addictionTypeId,
      isPublic = true,
      groupRules
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        error: 'Group name and description are required'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create the group
      const groupQuery = `
        INSERT INTO community_groups (
          name, description, addiction_type_id, created_by, is_public, group_rules, member_count
        ) VALUES ($1, $2, $3, $4, $5, $6, 1)
        RETURNING *
      `;

      const groupResult = await client.query(groupQuery, [
        name,
        description,
        addictionTypeId,
        req.user.id,
        isPublic,
        groupRules
      ]);

      const group = groupResult.rows[0];

      // Add creator as admin member
      await client.query(
        'INSERT INTO group_memberships (user_id, group_id, role) VALUES ($1, $2, $3)',
        [req.user.id, group.id, 'admin']
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Community group created successfully',
        group
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create community group' });
  }
});

// Get user's joined groups
router.get('/my-groups', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT cg.*, at.name as addiction_type_name, at.color as addiction_type_color,
             gm.role as user_role, gm.joined_at
      FROM community_groups cg
      JOIN group_memberships gm ON cg.id = gm.group_id
      LEFT JOIN addiction_types at ON cg.addiction_type_id = at.id
      WHERE gm.user_id = $1 AND gm.is_active = true
      ORDER BY gm.joined_at DESC
    `;

    const result = await pool.query(query, [req.user.id]);

    res.json({
      groups: result.rows
    });

  } catch (error) {
    console.error('Get my groups error:', error);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  }
});

// Join a group
router.post('/groups/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if group exists and is public
    const groupQuery = 'SELECT id, is_public FROM community_groups WHERE id = $1';
    const groupResult = await pool.query(groupQuery, [groupId]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    if (!group.is_public) {
      return res.status(403).json({ error: 'Cannot join private group' });
    }

    // Check if already a member
    const memberQuery = 'SELECT id FROM group_memberships WHERE user_id = $1 AND group_id = $2';
    const memberResult = await pool.query(memberQuery, [req.user.id, groupId]);

    if (memberResult.rows.length > 0) {
      return res.status(409).json({ error: 'Already a member of this group' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Add user to group
      await client.query(
        'INSERT INTO group_memberships (user_id, group_id, role) VALUES ($1, $2, $3)',
        [req.user.id, groupId, 'member']
      );

      // Update member count
      await client.query(
        'UPDATE community_groups SET member_count = member_count + 1 WHERE id = $1',
        [groupId]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Successfully joined the group'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Leave a group
router.post('/groups/:groupId/leave', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Remove user from group
      const deleteResult = await client.query(
        'DELETE FROM group_memberships WHERE user_id = $1 AND group_id = $2',
        [req.user.id, groupId]
      );

      if (deleteResult.rowCount === 0) {
        return res.status(404).json({ error: 'Not a member of this group' });
      }

      // Update member count
      await client.query(
        'UPDATE community_groups SET member_count = member_count - 1 WHERE id = $1',
        [groupId]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Successfully left the group'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Get posts for a group
router.get('/groups/:groupId/posts', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20, postType } = req.query;

    // Check if user is member of the group
    const memberQuery = 'SELECT role FROM group_memberships WHERE user_id = $1 AND group_id = $2 AND is_active = true';
    const memberResult = await pool.query(memberQuery, [req.user.id, groupId]);

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied - not a group member' });
    }

    let query = `
      SELECT cp.*, 
             CASE 
               WHEN cp.is_anonymous = true THEN 'Anonymous'
               ELSE u.first_name || ' ' || u.last_name
             END as author_name,
             CASE 
               WHEN cp.is_anonymous = true THEN 'anonymous'
               ELSE u.username
             END as author_username,
             CASE 
               WHEN cp.is_anonymous = true THEN NULL
               ELSE u.profile_picture_url
             END as author_profile_picture
      FROM community_posts cp
      LEFT JOIN users u ON cp.user_id = u.id
      WHERE cp.group_id = $1
    `;

    const params = [groupId];

    if (postType) {
      query += ` AND cp.post_type = $${params.length + 1}`;
      params.push(postType);
    }

    query += ` ORDER BY cp.is_pinned DESC, cp.created_at DESC`;

    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      posts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post in a group
router.post('/groups/:groupId/posts', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const {
      title,
      content,
      postType = 'general',
      isAnonymous = false
    } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Post content is required'
      });
    }

    // Check if user is member of the group
    const memberQuery = 'SELECT role FROM group_memberships WHERE user_id = $1 AND group_id = $2 AND is_active = true';
    const memberResult = await pool.query(memberQuery, [req.user.id, groupId]);

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied - not a group member' });
    }

    const query = `
      INSERT INTO community_posts (
        user_id, group_id, title, content, post_type, is_anonymous
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      req.user.id,
      groupId,
      title,
      content,
      postType,
      isAnonymous
    ]);

    res.status(201).json({
      message: 'Post created successfully',
      post: result.rows[0]
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get comments for a post
router.get('/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const query = `
      SELECT pc.*, 
             CASE 
               WHEN pc.is_anonymous = true THEN 'Anonymous'
               ELSE u.first_name || ' ' || u.last_name
             END as author_name,
             CASE 
               WHEN pc.is_anonymous = true THEN 'anonymous'
               ELSE u.username
             END as author_username,
             CASE 
               WHEN pc.is_anonymous = true THEN NULL
               ELSE u.profile_picture_url
             END as author_profile_picture
      FROM post_comments pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.post_id = $1
      ORDER BY pc.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const offset = (page - 1) * limit;
    const result = await pool.query(query, [postId, limit, offset]);

    res.json({
      comments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create a comment on a post
router.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      content,
      parentCommentId,
      isAnonymous = false
    } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Comment content is required'
      });
    }

    // Check if user has access to the post (via group membership)
    const accessQuery = `
      SELECT cp.group_id
      FROM community_posts cp
      JOIN group_memberships gm ON cp.group_id = gm.group_id
      WHERE cp.id = $1 AND gm.user_id = $2 AND gm.is_active = true
    `;

    const accessResult = await pool.query(accessQuery, [postId, req.user.id]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create comment
      const commentQuery = `
        INSERT INTO post_comments (
          post_id, user_id, parent_comment_id, content, is_anonymous
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const commentResult = await client.query(commentQuery, [
        postId,
        req.user.id,
        parentCommentId,
        content,
        isAnonymous
      ]);

      // Update post comment count
      await client.query(
        'UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = $1',
        [postId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Comment created successfully',
        comment: commentResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Like/unlike a post
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { isLiked } = req.body;

    // Check if user has access to the post
    const accessQuery = `
      SELECT cp.group_id
      FROM community_posts cp
      JOIN group_memberships gm ON cp.group_id = gm.group_id
      WHERE cp.id = $1 AND gm.user_id = $2 AND gm.is_active = true
    `;

    const accessResult = await pool.query(accessQuery, [postId, req.user.id]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const increment = isLiked ? 1 : -1;

    await pool.query(
      'UPDATE community_posts SET likes_count = GREATEST(0, likes_count + $1) WHERE id = $2',
      [increment, postId]
    );

    res.json({
      message: isLiked ? 'Post liked' : 'Post unliked'
    });

  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to update like status' });
  }
});

module.exports = router;