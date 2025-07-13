const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { Authorization } = require('../middleware/authorization');
const SecurityAudit = require('../utils/securityAudit');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

// Content safety analyzer
class MessageSafetyAnalyzer {
  static async analyzeMessage(content) {
    const analysis = {
      safetyScore: 100, // Start with safe score, reduce based on findings
      flaggedTerms: [],
      violations: [],
      isBlocked: false
    };

    try {
      // Get flagged terms from database
      const flaggedTermsQuery = 'SELECT term, category, severity, is_regex FROM flagged_terms WHERE is_active = true';
      const flaggedTermsResult = await pool.query(flaggedTermsQuery);
      
      const contentLower = content.toLowerCase();
      
      for (const flaggedTerm of flaggedTermsResult.rows) {
        let isMatch = false;
        
        if (flaggedTerm.is_regex) {
          const regex = new RegExp(flaggedTerm.term, 'i');
          isMatch = regex.test(content);
        } else {
          isMatch = contentLower.includes(flaggedTerm.term.toLowerCase());
        }
        
        if (isMatch) {
          analysis.flaggedTerms.push({
            term: flaggedTerm.term,
            category: flaggedTerm.category,
            severity: flaggedTerm.severity
          });
          
          // Reduce safety score based on severity
          analysis.safetyScore -= flaggedTerm.severity * 10;
          
          // Add violation
          const violationType = this.mapCategoryToViolation(flaggedTerm.category);
          if (!analysis.violations.find(v => v.type === violationType)) {
            analysis.violations.push({
              type: violationType,
              severity: flaggedTerm.severity,
              terms: [flaggedTerm.term]
            });
          } else {
            const existing = analysis.violations.find(v => v.type === violationType);
            existing.terms.push(flaggedTerm.term);
            existing.severity = Math.max(existing.severity, flaggedTerm.severity);
          }
        }
      }
      
      // Ensure safety score doesn't go below 0
      analysis.safetyScore = Math.max(0, analysis.safetyScore);
      
      // Block message if safety score is too low or high severity violations
      const hasHighSeverityViolation = analysis.violations.some(v => v.severity >= 4);
      analysis.isBlocked = analysis.safetyScore <= 30 || hasHighSeverityViolation;
      
      return analysis;
    } catch (error) {
      console.error('Message safety analysis error:', error);
      // Default to safe if analysis fails
      return analysis;
    }
  }
  
  static mapCategoryToViolation(category) {
    const mapping = {
      'drugs': 'substance_offering',
      'dealing': 'drug_dealing',
      'contact_exchange': 'suspicious_contact_exchange',
      'predatory': 'predatory_behavior',
      'spam': 'spam',
      'harmful': 'inappropriate_content'
    };
    return mapping[category] || 'inappropriate_content';
  }
}

// Check if user has messaging restrictions
async function checkMessagingRestrictions(userId) {
  const query = `
    SELECT restriction_type, reason, restricted_until, is_permanent
    FROM user_messaging_restrictions 
    WHERE user_id = $1 
    AND (is_permanent = true OR restricted_until > CURRENT_TIMESTAMP)
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
}

// Create a new conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { participantIds, title, conversationType = 'private' } = req.body;

    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({
        error: 'At least one participant is required'
      });
    }

    // Check messaging restrictions
    const restriction = await checkMessagingRestrictions(req.user.id);
    if (restriction) {
      return res.status(403).json({
        error: 'Messaging is currently restricted',
        restriction
      });
    }

    // Add creator to participants if not already included
    const allParticipants = Array.from(new Set([req.user.id, ...participantIds]));

    // For private conversations, limit to 2 participants
    if (conversationType === 'private' && allParticipants.length > 2) {
      return res.status(400).json({
        error: 'Private conversations can only have 2 participants'
      });
    }

    // Check if private conversation already exists between these users
    if (conversationType === 'private' && allParticipants.length === 2) {
      const existingQuery = `
        SELECT id FROM conversations 
        WHERE conversation_type = 'private' 
        AND participants @> $1 
        AND jsonb_array_length(participants) = 2
        AND is_active = true
      `;
      
      const existingResult = await pool.query(existingQuery, [JSON.stringify(allParticipants)]);
      
      if (existingResult.rows.length > 0) {
        return res.json({
          message: 'Conversation already exists',
          conversation: { id: existingResult.rows[0].id }
        });
      }
    }

    const query = `
      INSERT INTO conversations (
        conversation_type, title, participants, created_by
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      conversationType,
      title,
      JSON.stringify(allParticipants),
      req.user.id
    ]);

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: result.rows[0]
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = `
      SELECT c.*, 
             COUNT(m.id) as message_count,
             MAX(m.created_at) as last_message_time
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id AND m.is_deleted = false
      WHERE c.participants @> $1 AND c.is_active = true
      GROUP BY c.id
      ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
      LIMIT $2 OFFSET $3
    `;

    const offset = (page - 1) * limit;
    const result = await pool.query(query, [
      JSON.stringify([req.user.id]),
      limit,
      offset
    ]);

    // Filter conversation data to remove sensitive information
    const filteredConversations = result.rows.map(conversation => 
      DataFilter.filterSensitiveData(conversation, {
        allowSensitive: false,
        requesterRole: req.user.role
      })
    );

    res.json({
      conversations: filteredConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Send a message
router.post('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text', parentMessageId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Message content is required'
      });
    }

    // Check messaging restrictions
    const restriction = await checkMessagingRestrictions(req.user.id);
    if (restriction) {
      return res.status(403).json({
        error: 'Messaging is currently restricted',
        restriction
      });
    }

    // Verify user is participant in conversation
    const conversationQuery = `
      SELECT participants, is_active, is_monitored 
      FROM conversations 
      WHERE id = $1
    `;
    
    const conversationResult = await pool.query(conversationQuery, [conversationId]);
    
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    const conversation = conversationResult.rows[0];
    
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        error: 'You are not a participant in this conversation'
      });
    }

    if (!conversation.is_active) {
      return res.status(403).json({
        error: 'This conversation is no longer active'
      });
    }

    // Analyze message content for safety
    const safetyAnalysis = await MessageSafetyAnalyzer.analyzeMessage(content);

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create the message
      const messageQuery = `
        INSERT INTO messages (
          conversation_id, sender_id, content, message_type, 
          safety_score, flagged_content, is_blocked, 
          moderation_status, parent_message_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const moderationStatus = safetyAnalysis.isBlocked ? 'blocked' : 
                              safetyAnalysis.flaggedTerms.length > 0 ? 'flagged' : 'pending';

      const messageResult = await client.query(messageQuery, [
        conversationId,
        req.user.id,
        content,
        messageType,
        safetyAnalysis.safetyScore,
        JSON.stringify(safetyAnalysis.flaggedTerms),
        safetyAnalysis.isBlocked,
        moderationStatus,
        parentMessageId
      ]);

      const message = messageResult.rows[0];

      // Log safety violations if any
      for (const violation of safetyAnalysis.violations) {
        await client.query(
          `INSERT INTO message_safety_logs (
            message_id, user_id, violation_type, severity_level, 
            flagged_terms, action_taken
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            message.id,
            req.user.id,
            violation.type,
            violation.severity,
            JSON.stringify(violation.terms),
            safetyAnalysis.isBlocked ? 'blocked' : 'flagged'
          ]
        );
      }

      // Add to moderation queue if flagged or blocked
      if (safetyAnalysis.flaggedTerms.length > 0 || safetyAnalysis.isBlocked) {
        const priority = safetyAnalysis.violations.some(v => v.severity >= 4) ? 5 : 
                        safetyAnalysis.violations.some(v => v.severity >= 3) ? 4 : 3;

        await client.query(
          `INSERT INTO moderation_queue (
            item_type, item_id, priority, violation_types, 
            safety_score, auto_flagged
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'message',
            message.id,
            priority,
            JSON.stringify(safetyAnalysis.violations.map(v => v.type)),
            safetyAnalysis.safetyScore,
            true
          ]
        );
      }

      // Update conversation last message time
      await client.query(
        'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
        [conversationId]
      );

      // Apply automatic restrictions for severe violations
      if (safetyAnalysis.violations.some(v => v.severity >= 5)) {
        await client.query(
          `INSERT INTO user_messaging_restrictions (
            user_id, restriction_type, reason, restricted_until
          ) VALUES ($1, $2, $3, $4)`,
          [
            req.user.id,
            'temporary_mute',
            'Automatic restriction due to severe content violation',
            new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          ]
        );
      }

      await client.query('COMMIT');

      // Return message with safety info
      const response = {
        message: safetyAnalysis.isBlocked ? 'Message blocked due to policy violation' : 'Message sent successfully',
        messageData: safetyAnalysis.isBlocked ? null : message,
        safetyInfo: {
          isBlocked: safetyAnalysis.isBlocked,
          safetyScore: safetyAnalysis.safetyScore,
          moderationStatus: moderationStatus,
          violations: safetyAnalysis.violations.length > 0 ? safetyAnalysis.violations.map(v => v.type) : null
        }
      };

      if (safetyAnalysis.isBlocked) {
        return res.status(400).json(response);
      }

      res.status(201).json(response);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, since } = req.query;

    // Verify user is participant
    const conversationQuery = `
      SELECT participants FROM conversations WHERE id = $1
    `;
    
    const conversationResult = await pool.query(conversationQuery, [conversationId]);
    
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    if (!conversationResult.rows[0].participants.includes(req.user.id)) {
      return res.status(403).json({
        error: 'You are not a participant in this conversation'
      });
    }

    let query = `
      SELECT m.*, 
             u.first_name || ' ' || u.last_name as sender_name,
             u.username as sender_username,
             u.profile_picture_url as sender_profile_picture
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 
      AND m.is_deleted = false 
      AND (m.is_blocked = false OR m.sender_id = $2)
    `;

    const params = [conversationId, req.user.id];

    if (since) {
      query += ` AND m.created_at > $${params.length + 1}`;
      params.push(since);
    }

    query += ` ORDER BY m.created_at DESC`;

    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Filter message data to remove sensitive information
    const filteredMessages = result.rows.reverse().map(message => 
      DataFilter.filterMessageData(message, {
        includeModeratorInfo: ['moderator', 'admin'].includes(req.user.role),
        includeMetadata: req.user.role === 'admin',
        requesterRole: req.user.role
      })
    );

    res.json({
      messages: filteredMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Report a message
router.post('/messages/:messageId/report', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reportType, description } = req.body;

    if (!reportType) {
      return res.status(400).json({
        error: 'Report type is required'
      });
    }

    // Verify message exists and user has access
    const messageQuery = `
      SELECT m.*, c.participants
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = $1
    `;

    const messageResult = await pool.query(messageQuery, [messageId]);

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Message not found'
      });
    }

    const message = messageResult.rows[0];

    if (!message.participants.includes(req.user.id)) {
      return res.status(403).json({
        error: 'You do not have access to this message'
      });
    }

    // Check if already reported by this user
    const existingReportQuery = `
      SELECT id FROM message_reports 
      WHERE message_id = $1 AND reported_by = $2
    `;

    const existingReport = await pool.query(existingReportQuery, [messageId, req.user.id]);

    if (existingReport.rows.length > 0) {
      return res.status(409).json({
        error: 'You have already reported this message'
      });
    }

    // Create the report
    const reportQuery = `
      INSERT INTO message_reports (
        message_id, reported_by, report_type, description
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const reportResult = await pool.query(reportQuery, [
      messageId,
      req.user.id,
      reportType,
      description
    ]);

    res.status(201).json({
      message: 'Message reported successfully',
      report: reportResult.rows[0]
    });

  } catch (error) {
    console.error('Report message error:', error);
    res.status(500).json({ error: 'Failed to report message' });
  }
});

// Input validation for messaging endpoints
const validateMessagingInput = Authorization.validateInput({
  period: {
    allowedValues: ['1h', '24h', '7d', '30d', '90d'],
    required: false
  }
});

// Get messaging safety statistics (for moderation) - SECURED
router.get('/safety-stats', 
  authenticateToken, 
  Authorization.requirePermission('read:moderation_queue'),
  validateMessagingInput,
  async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Create secure date filter with parameterized query
    const dateFilter = Authorization.createDateFilter(period);
    
    // Log access to sensitive safety statistics
    await SecurityAudit.logDataAccess(req, 'messaging_safety_statistics');

    // Get violation statistics - SECURE with parameterized query
    const violationStatsQuery = `
      SELECT violation_type, severity_level, COUNT(*) as count
      FROM message_safety_logs 
      WHERE ${dateFilter.whereClause}
      GROUP BY violation_type, severity_level
      ORDER BY count DESC
    `;

    const violationStats = await pool.query(violationStatsQuery, [dateFilter.parameter]);

    // Get blocked messages count - SECURE with parameterized query
    const blockedMessagesQuery = `
      SELECT COUNT(*) as blocked_count
      FROM messages 
      WHERE is_blocked = true AND ${dateFilter.whereClause}
    `;

    const blockedMessages = await pool.query(blockedMessagesQuery, [dateFilter.parameter]);

    // Get reports statistics - SECURE with parameterized query
    const reportStatsQuery = `
      SELECT report_type, status, COUNT(*) as count
      FROM message_reports 
      WHERE ${dateFilter.whereClause}
      GROUP BY report_type, status
      ORDER BY count DESC
    `;

    const reportStats = await pool.query(reportStatsQuery, [dateFilter.parameter]);

    res.json({
      period,
      violationStats: violationStats.rows,
      blockedMessagesCount: parseInt(blockedMessages.rows[0].blocked_count),
      reportStats: reportStats.rows
    });

  } catch (error) {
    console.error('Get safety stats error:', error);
    res.status(500).json({ error: 'Failed to fetch safety statistics' });
  }
});

module.exports = router;