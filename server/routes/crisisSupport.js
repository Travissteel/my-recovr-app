const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Emergency contact information by region
const EMERGENCY_CONTACTS = {
  US: {
    emergency: '911',
    suicide: '988',
    crisis_text: 'Text HOME to 741741',
    samhsa: '1-800-662-4357',
    addiction: '1-844-289-0879'
  },
  UK: {
    emergency: '999',
    samaritans: '116 123',
    addiction: '0300 123 1110'
  },
  AU: {
    emergency: '000',
    lifeline: '13 11 14',
    addiction: '1800 250 015'
  },
  CA: {
    emergency: '911',
    crisis: '1-833-456-4566',
    addiction: '1-866-585-0445'
  }
};

// Crisis level definitions and automatic actions
const CRISIS_ACTIONS = {
  5: { // Immediate danger
    requiresProfessionalResponse: true,
    contactEmergencyServices: true,
    alertModerators: true,
    showEmergencyBanner: true
  },
  4: { // High risk
    requiresProfessionalResponse: true,
    contactEmergencyServices: false,
    alertModerators: true,
    showEmergencyBanner: true
  },
  3: { // Moderate risk
    requiresProfessionalResponse: true,
    contactEmergencyServices: false,
    alertModerators: true,
    showEmergencyBanner: false
  },
  2: { // Low risk
    requiresProfessionalResponse: false,
    contactEmergencyServices: false,
    alertModerators: false,
    showEmergencyBanner: false
  },
  1: { // Support needed
    requiresProfessionalResponse: false,
    contactEmergencyServices: false,
    alertModerators: false,
    showEmergencyBanner: false
  }
};

// Get crisis resources based on location
router.get('/resources', async (req, res) => {
  try {
    const { country = 'US', emergencyOnly = false } = req.query;
    
    // Get database resources
    let query = 'SELECT * FROM crisis_resources WHERE 1=1';
    const params = [];
    
    if (emergencyOnly === 'true') {
      query += ' AND is_24_7 = true';
    }
    
    query += ' ORDER BY is_24_7 DESC, title ASC';
    
    const dbResources = await pool.query(query, params);
    
    // Combine with regional emergency contacts
    const emergencyContacts = EMERGENCY_CONTACTS[country] || EMERGENCY_CONTACTS.US;
    
    res.json({
      emergencyContacts,
      resources: dbResources.rows,
      disclaimer: 'If you are in immediate danger, please contact emergency services immediately.'
    });
    
  } catch (error) {
    console.error('Get crisis resources error:', error);
    res.status(500).json({ error: 'Failed to fetch crisis resources' });
  }
});

// Create a crisis support post
router.post('/support-posts', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      content,
      crisisLevel,
      supportType,
      isAnonymous = false,
      locationData
    } = req.body;

    if (!content || !crisisLevel || !supportType) {
      return res.status(400).json({
        error: 'Content, crisis level, and support type are required'
      });
    }

    if (crisisLevel < 1 || crisisLevel > 5) {
      return res.status(400).json({
        error: 'Crisis level must be between 1 and 5'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get crisis action requirements
      const actions = CRISIS_ACTIONS[crisisLevel];
      
      // Create the crisis post
      const postQuery = `
        INSERT INTO crisis_support_posts (
          user_id, title, content, crisis_level, support_type, 
          is_anonymous, professional_response_needed, location_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const postResult = await client.query(postQuery, [
        req.user.id,
        title,
        content,
        crisisLevel,
        supportType,
        isAnonymous,
        actions.requiresProfessionalResponse,
        locationData ? JSON.stringify(locationData) : null
      ]);

      const post = postResult.rows[0];

      // Log emergency contact if required
      if (actions.contactEmergencyServices || crisisLevel >= 4) {
        await client.query(
          `INSERT INTO emergency_contact_log (
            user_id, crisis_post_id, contact_type, contact_info, notes
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user.id,
            post.id,
            'crisis_hotline',
            'Automatic referral - Crisis level ' + crisisLevel,
            'User needs immediate professional assistance'
          ]
        );
      }

      // Create immediate intervention if crisis level 5
      if (crisisLevel === 5) {
        await client.query(
          `INSERT INTO crisis_interventions (
            user_id, crisis_type, severity_level, description, location_data
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user.id,
            'crisis_support_request',
            5,
            'Emergency crisis support post created',
            locationData ? JSON.stringify(locationData) : null
          ]
        );
      }

      await client.query('COMMIT');

      // Prepare response with emergency information
      const response = {
        message: 'Crisis support request created',
        post,
        emergencyInfo: null,
        nextSteps: []
      };

      // Add emergency information based on crisis level
      if (crisisLevel >= 4) {
        response.emergencyInfo = {
          immediate: true,
          contacts: EMERGENCY_CONTACTS.US, // Default to US, should be based on user location
          message: 'Please consider contacting emergency services or a crisis hotline immediately.'
        };
        response.nextSteps.push('Contact a crisis hotline');
        response.nextSteps.push('Reach out to a trusted friend or family member');
        response.nextSteps.push('Go to your nearest emergency room if in immediate danger');
      } else if (crisisLevel >= 3) {
        response.nextSteps.push('Consider contacting a crisis hotline');
        response.nextSteps.push('Reach out to your support network');
        response.nextSteps.push('Schedule an appointment with a mental health professional');
      }

      res.status(201).json(response);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create crisis post error:', error);
    res.status(500).json({ error: 'Failed to create crisis support request' });
  }
});

// Get crisis support posts (prioritized by crisis level and time)
router.get('/support-posts', authenticateToken, async (req, res) => {
  try {
    const { 
      crisisLevel, 
      supportType, 
      resolved = false, 
      page = 1, 
      limit = 20 
    } = req.query;

    let query = `
      SELECT csp.*, 
             CASE 
               WHEN csp.is_anonymous = true THEN 'Anonymous User'
               ELSE u.first_name || ' ' || u.last_name
             END as author_name,
             CASE 
               WHEN csp.is_anonymous = true THEN 'anonymous'
               ELSE u.username
             END as author_username,
             CASE 
               WHEN csp.is_anonymous = true THEN NULL
               ELSE u.profile_picture_url
             END as author_profile_picture
      FROM crisis_support_posts csp
      LEFT JOIN users u ON csp.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (crisisLevel) {
      query += ` AND csp.crisis_level = $${params.length + 1}`;
      params.push(crisisLevel);
    }

    if (supportType) {
      query += ` AND csp.support_type = $${params.length + 1}`;
      params.push(supportType);
    }

    if (resolved !== undefined) {
      query += ` AND csp.is_resolved = $${params.length + 1}`;
      params.push(resolved === 'true');
    }

    // Order by crisis level (highest first), then by creation time (newest first)
    query += ` ORDER BY csp.crisis_level DESC, csp.created_at DESC`;

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
    console.error('Get crisis posts error:', error);
    res.status(500).json({ error: 'Failed to fetch crisis support posts' });
  }
});

// Respond to a crisis support post
router.post('/support-posts/:postId/responses', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      content,
      responseType = 'peer_support',
      isProfessional = false,
      professionalCredentials
    } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Response content is required'
      });
    }

    // Verify the post exists
    const postQuery = 'SELECT id, crisis_level FROM crisis_support_posts WHERE id = $1';
    const postResult = await pool.query(postQuery, [postId]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Crisis support post not found'
      });
    }

    const post = postResult.rows[0];

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create the response
      const responseQuery = `
        INSERT INTO crisis_support_responses (
          post_id, responder_id, response_type, content, 
          is_professional, professional_credentials
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const responseResult = await client.query(responseQuery, [
        postId,
        req.user.id,
        responseType,
        content,
        isProfessional,
        professionalCredentials
      ]);

      // Update response count
      await client.query(
        'UPDATE crisis_support_posts SET response_count = response_count + 1 WHERE id = $1',
        [postId]
      );

      // If professional response to high crisis level, mark as professionally responded
      if (isProfessional && post.crisis_level >= 3) {
        await client.query(
          'UPDATE crisis_support_posts SET professional_response_needed = false WHERE id = $1',
          [postId]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Crisis support response created',
        response: responseResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create crisis response error:', error);
    res.status(500).json({ error: 'Failed to create crisis support response' });
  }
});

// Get responses for a crisis support post
router.get('/support-posts/:postId/responses', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const query = `
      SELECT csr.*, 
             u.first_name || ' ' || u.last_name as responder_name,
             u.username as responder_username,
             u.profile_picture_url as responder_profile_picture
      FROM crisis_support_responses csr
      JOIN users u ON csr.responder_id = u.id
      WHERE csr.post_id = $1
      ORDER BY csr.is_professional DESC, csr.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const offset = (page - 1) * limit;
    const result = await pool.query(query, [postId, limit, offset]);

    res.json({
      responses: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get crisis responses error:', error);
    res.status(500).json({ error: 'Failed to fetch crisis support responses' });
  }
});

// Mark crisis post as resolved
router.post('/support-posts/:postId/resolve', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { resolutionNotes } = req.body;

    // Verify the user owns the post or is a moderator
    const postQuery = `
      SELECT user_id FROM crisis_support_posts WHERE id = $1
    `;
    const postResult = await pool.query(postQuery, [postId]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Crisis support post not found'
      });
    }

    if (postResult.rows[0].user_id !== req.user.id) {
      // TODO: Check if user is moderator
      return res.status(403).json({
        error: 'Only the post author can mark it as resolved'
      });
    }

    await pool.query(
      `UPDATE crisis_support_posts 
       SET is_resolved = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [postId]
    );

    res.json({
      message: 'Crisis support post marked as resolved'
    });

  } catch (error) {
    console.error('Resolve crisis post error:', error);
    res.status(500).json({ error: 'Failed to resolve crisis support post' });
  }
});

// Emergency escalation endpoint
router.post('/emergency-escalation', authenticateToken, async (req, res) => {
  try {
    const { postId, escalationType, notes, locationData } = req.body;

    // Log the escalation
    await pool.query(
      `INSERT INTO emergency_contact_log (
        user_id, crisis_post_id, contact_type, notes, contacted_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [req.user.id, postId, escalationType, notes]
    );

    // Get appropriate emergency contacts
    const emergencyContacts = EMERGENCY_CONTACTS.US; // Should be based on user location

    res.json({
      message: 'Emergency escalation logged',
      emergencyContacts,
      nextSteps: [
        'Contact emergency services: ' + emergencyContacts.emergency,
        'Call suicide prevention lifeline: ' + emergencyContacts.suicide,
        'Text crisis support: ' + emergencyContacts.crisis_text
      ]
    });

  } catch (error) {
    console.error('Emergency escalation error:', error);
    res.status(500).json({ error: 'Failed to log emergency escalation' });
  }
});

module.exports = router;