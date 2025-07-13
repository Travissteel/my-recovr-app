const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get crisis resources
router.get('/resources', async (req, res) => {
  try {
    const { resourceType, available247 } = req.query;
    
    let query = 'SELECT * FROM crisis_resources WHERE 1=1';
    const params = [];
    
    if (resourceType) {
      query += ` AND resource_type = $${params.length + 1}`;
      params.push(resourceType);
    }
    
    if (available247 === 'true') {
      query += ` AND is_24_7 = true`;
    }
    
    query += ' ORDER BY resource_type, title';
    
    const result = await pool.query(query, params);
    
    res.json({
      resources: result.rows
    });
    
  } catch (error) {
    console.error('Get crisis resources error:', error);
    res.status(500).json({ error: 'Failed to fetch crisis resources' });
  }
});

// Create a crisis intervention request
router.post('/interventions', authenticateToken, async (req, res) => {
  try {
    const {
      crisisType,
      severityLevel,
      description,
      locationData,
      emergencyContactsNotified = false
    } = req.body;

    if (!crisisType || !severityLevel) {
      return res.status(400).json({
        error: 'Crisis type and severity level are required'
      });
    }

    if (severityLevel < 1 || severityLevel > 5) {
      return res.status(400).json({
        error: 'Severity level must be between 1 and 5'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create crisis intervention record
      const interventionQuery = `
        INSERT INTO crisis_interventions (
          user_id, crisis_type, severity_level, description, location_data, emergency_contacts_notified
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const interventionResult = await client.query(interventionQuery, [
        req.user.id,
        crisisType,
        severityLevel,
        description,
        JSON.stringify(locationData),
        emergencyContactsNotified
      ]);

      const intervention = interventionResult.rows[0];

      // Create notification for user
      await client.query(
        `INSERT INTO notifications (user_id, title, message, notification_type, action_url) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'Crisis Intervention Initiated',
          `We've received your crisis intervention request. Help is available 24/7.`,
          'crisis',
          `/crisis/${intervention.id}`
        ]
      );

      // Get user's support network for notifications
      const supportQuery = `
        SELECT * FROM support_network 
        WHERE user_id = $1 AND can_receive_crisis_alerts = true
      `;
      
      const supportResult = await client.query(supportQuery, [req.user.id]);

      // If severity is high (4-5), automatically mark for professional help
      if (severityLevel >= 4) {
        await client.query(
          'UPDATE crisis_interventions SET professional_help_contacted = true WHERE id = $1',
          [intervention.id]
        );
      }

      await client.query('COMMIT');

      // Send real-time notification via socket.io
      const io = req.app.get('io');
      if (io) {
        io.to('crisis_interventions').emit('new_crisis_alert', {
          interventionId: intervention.id,
          userId: req.user.id,
          crisisType,
          severityLevel,
          timestamp: intervention.created_at
        });
      }

      res.status(201).json({
        message: 'Crisis intervention request created successfully',
        intervention: intervention,
        supportContacts: supportResult.rows,
        emergencyResources: await getEmergencyResources()
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create crisis intervention error:', error);
    res.status(500).json({ error: 'Failed to create crisis intervention request' });
  }
});

// Get user's crisis interventions
router.get('/interventions', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT * FROM crisis_interventions 
      WHERE user_id = $1
    `;
    
    const params = [req.user.id];
    
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      interventions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get interventions error:', error);
    res.status(500).json({ error: 'Failed to fetch crisis interventions' });
  }
});

// Get specific crisis intervention
router.get('/interventions/:interventionId', authenticateToken, async (req, res) => {
  try {
    const { interventionId } = req.params;
    
    const query = `
      SELECT * FROM crisis_interventions 
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [interventionId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crisis intervention not found' });
    }
    
    res.json({
      intervention: result.rows[0]
    });
    
  } catch (error) {
    console.error('Get intervention error:', error);
    res.status(500).json({ error: 'Failed to fetch crisis intervention' });
  }
});

// Update crisis intervention status
router.patch('/interventions/:interventionId', authenticateToken, async (req, res) => {
  try {
    const { interventionId } = req.params;
    const {
      status,
      resolutionNotes,
      professionalHelpContacted,
      emergencyContactsNotified
    } = req.body;

    const updateFields = [];
    const params = [];

    if (status) {
      updateFields.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (resolutionNotes) {
      updateFields.push(`resolution_notes = $${params.length + 1}`);
      params.push(resolutionNotes);
    }

    if (professionalHelpContacted !== undefined) {
      updateFields.push(`professional_help_contacted = $${params.length + 1}`);
      params.push(professionalHelpContacted);
    }

    if (emergencyContactsNotified !== undefined) {
      updateFields.push(`emergency_contacts_notified = $${params.length + 1}`);
      params.push(emergencyContactsNotified);
    }

    if (status === 'resolved') {
      updateFields.push('resolved_at = CURRENT_TIMESTAMP');
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `
      UPDATE crisis_interventions 
      SET ${updateFields.join(', ')}
      WHERE id = $${params.length + 1} AND user_id = $${params.length + 2}
      RETURNING *
    `;

    params.push(interventionId, req.user.id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crisis intervention not found' });
    }

    res.json({
      message: 'Crisis intervention updated successfully',
      intervention: result.rows[0]
    });

  } catch (error) {
    console.error('Update intervention error:', error);
    res.status(500).json({ error: 'Failed to update crisis intervention' });
  }
});

// Get user's support network
router.get('/support-network', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT * FROM support_network 
      WHERE user_id = $1 
      ORDER BY role, supporter_name
    `;
    
    const result = await pool.query(query, [req.user.id]);
    
    res.json({
      supportNetwork: result.rows
    });
    
  } catch (error) {
    console.error('Get support network error:', error);
    res.status(500).json({ error: 'Failed to fetch support network' });
  }
});

// Add support contact
router.post('/support-network', authenticateToken, async (req, res) => {
  try {
    const {
      supporterName,
      supporterEmail,
      supporterPhone,
      relationship,
      role = 'supporter',
      canReceiveCrisisAlerts = true,
      notes
    } = req.body;

    if (!supporterName || (!supporterEmail && !supporterPhone)) {
      return res.status(400).json({
        error: 'Supporter name and either email or phone number are required'
      });
    }

    const query = `
      INSERT INTO support_network (
        user_id, supporter_name, supporter_email, supporter_phone, 
        relationship, role, can_receive_crisis_alerts, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(query, [
      req.user.id,
      supporterName,
      supporterEmail,
      supporterPhone,
      relationship,
      role,
      canReceiveCrisisAlerts,
      notes
    ]);

    res.status(201).json({
      message: 'Support contact added successfully',
      supportContact: result.rows[0]
    });

  } catch (error) {
    console.error('Add support contact error:', error);
    res.status(500).json({ error: 'Failed to add support contact' });
  }
});

// Update support contact
router.put('/support-network/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const {
      supporterName,
      supporterEmail,
      supporterPhone,
      relationship,
      role,
      canReceiveCrisisAlerts,
      notes
    } = req.body;

    const query = `
      UPDATE support_network 
      SET supporter_name = COALESCE($1, supporter_name),
          supporter_email = COALESCE($2, supporter_email),
          supporter_phone = COALESCE($3, supporter_phone),
          relationship = COALESCE($4, relationship),
          role = COALESCE($5, role),
          can_receive_crisis_alerts = COALESCE($6, can_receive_crisis_alerts),
          notes = COALESCE($7, notes)
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `;

    const result = await pool.query(query, [
      supporterName,
      supporterEmail,
      supporterPhone,
      relationship,
      role,
      canReceiveCrisisAlerts,
      notes,
      contactId,
      req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Support contact not found' });
    }

    res.json({
      message: 'Support contact updated successfully',
      supportContact: result.rows[0]
    });

  } catch (error) {
    console.error('Update support contact error:', error);
    res.status(500).json({ error: 'Failed to update support contact' });
  }
});

// Delete support contact
router.delete('/support-network/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;

    const result = await pool.query(
      'DELETE FROM support_network WHERE id = $1 AND user_id = $2',
      [contactId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Support contact not found' });
    }

    res.json({
      message: 'Support contact deleted successfully'
    });

  } catch (error) {
    console.error('Delete support contact error:', error);
    res.status(500).json({ error: 'Failed to delete support contact' });
  }
});

// Helper function to get emergency resources
async function getEmergencyResources() {
  try {
    const query = `
      SELECT * FROM crisis_resources 
      WHERE resource_type = 'emergency' OR is_24_7 = true 
      ORDER BY resource_type, title
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Get emergency resources error:', error);
    return [];
  }
}

module.exports = router;