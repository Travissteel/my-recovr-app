const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const SecurityAudit = require('../utils/securityAudit');
const DataFilter = require('../utils/dataFilter');

const router = express.Router();

/**
 * Mentor Program with Free Access Incentives
 * - 365+ days: Eligible for mentor program
 * - Year 1: Free premium access while actively mentoring
 * - Year 2+: Lifetime free access for continued engagement
 */

// Mentor program configuration
const MENTOR_CONFIG = {
  eligibilityDays: 365,
  minMenteesForFreeAccess: 2,
  minMonthlyActivitiesForFreeAccess: 10,
  freeAccessDurationMonths: 12,
  lifetimeMembershipDays: 730, // 2 years of mentoring
  
  // Activity types that count toward engagement
  engagementActivities: [
    'mentee_message',
    'group_help',
    'crisis_response',
    'challenge_support',
    'milestone_celebration',
    'community_post',
    'wisdom_share'
  ],
  
  // Mentor subscription benefits
  benefits: {
    premiumFeatures: true,
    extendedAnalytics: true,
    prioritySupport: true,
    mentorBadges: true,
    advancedInsights: true,
    communityModeration: true
  }
};

// Check mentor eligibility
router.get('/eligibility', authenticateToken, async (req, res) => {
  try {
    // Get user's recovery progress
    const progressQuery = `
      SELECT 
        MAX(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400) as max_days_clean,
        COUNT(rp.id) as active_programs
      FROM recovery_programs rp
      WHERE rp.user_id = $1 AND rp.status = 'active'
    `;
    
    const progress = await pool.query(progressQuery, [req.user.id]);
    const maxDays = Math.floor(progress.rows[0]?.max_days_clean || 0);
    
    // Check current mentor status
    const mentorQuery = `
      SELECT m.*, ms.subscription_type, ms.expires_at, ms.is_lifetime
      FROM mentors m
      LEFT JOIN mentor_subscriptions ms ON m.id = ms.mentor_id
      WHERE m.user_id = $1 AND m.status = 'active'
    `;
    
    const mentor = await pool.query(mentorQuery, [req.user.id]);
    const isCurrentMentor = mentor.rows.length > 0;
    
    // Calculate eligibility
    const isEligible = maxDays >= MENTOR_CONFIG.eligibilityDays;
    const daysUntilEligible = Math.max(0, MENTOR_CONFIG.eligibilityDays - maxDays);
    
    // Get mentor statistics if applicable
    let mentorStats = null;
    if (isCurrentMentor) {
      mentorStats = await getMentorStatistics(mentor.rows[0].id);
    }
    
    res.json({
      isEligible,
      daysUntilEligible,
      currentDaysClean: maxDays,
      requiredDays: MENTOR_CONFIG.eligibilityDays,
      isCurrentMentor,
      mentorInfo: isCurrentMentor ? {
        ...mentor.rows[0],
        statistics: mentorStats
      } : null,
      benefits: MENTOR_CONFIG.benefits,
      requirements: {
        minMentees: MENTOR_CONFIG.minMenteesForFreeAccess,
        minMonthlyActivities: MENTOR_CONFIG.minMonthlyActivitiesForFreeAccess,
        engagementActivities: MENTOR_CONFIG.engagementActivities
      }
    });

  } catch (error) {
    console.error('Check mentor eligibility error:', error);
    res.status(500).json({ error: 'Failed to check mentor eligibility' });
  }
});

// Apply to become a mentor
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { motivation, specialties, availability, mentorshipExperience } = req.body;
    
    // Verify eligibility
    const progressQuery = `
      SELECT MAX(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400) as max_days_clean
      FROM recovery_programs rp
      WHERE rp.user_id = $1 AND rp.status = 'active'
    `;
    
    const progress = await pool.query(progressQuery, [req.user.id]);
    const maxDays = Math.floor(progress.rows[0]?.max_days_clean || 0);
    
    if (maxDays < MENTOR_CONFIG.eligibilityDays) {
      return res.status(400).json({ 
        error: `Must have ${MENTOR_CONFIG.eligibilityDays} days clean to apply for mentor program` 
      });
    }
    
    // Check if already a mentor or has pending application
    const existingQuery = `
      SELECT id, status FROM mentors WHERE user_id = $1
    `;
    const existing = await pool.query(existingQuery, [req.user.id]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You already have a mentor application or are an active mentor' 
      });
    }
    
    // Create mentor application
    const applicationQuery = `
      INSERT INTO mentors (
        user_id, status, motivation, specialties, availability, 
        mentorship_experience, days_clean_at_application, applied_at
      ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    
    const application = await pool.query(applicationQuery, [
      req.user.id,
      motivation,
      JSON.stringify(specialties || []),
      JSON.stringify(availability || {}),
      mentorshipExperience,
      maxDays
    ]);
    
    // Log application
    await SecurityAudit.logEvent({
      userId: req.user.id,
      eventType: 'mentor_application_submitted',
      eventDescription: 'User applied to become a mentor',
      severity: 'info',
      metadata: {
        mentorId: application.rows[0].id,
        daysClean: maxDays,
        specialties: specialties
      }
    });
    
    res.json({
      message: 'Mentor application submitted successfully',
      applicationId: application.rows[0].id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Mentor application error:', error);
    res.status(500).json({ error: 'Failed to submit mentor application' });
  }
});

// Get mentor dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Verify user is an active mentor
    const mentorQuery = `
      SELECT m.*, ms.subscription_type, ms.expires_at, ms.is_lifetime, ms.free_access_earned
      FROM mentors m
      LEFT JOIN mentor_subscriptions ms ON m.id = ms.mentor_id
      WHERE m.user_id = $1 AND m.status = 'active'
    `;
    
    const mentor = await pool.query(mentorQuery, [req.user.id]);
    
    if (mentor.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Not an active mentor' });
    }
    
    const mentorInfo = mentor.rows[0];
    
    // Get mentor statistics
    const stats = await getMentorStatistics(mentorInfo.id);
    
    // Get assigned mentees
    const menteesQuery = `
      SELECT 
        mm.id as mentorship_id,
        u.id, u.first_name, u.username, u.profile_picture_url,
        mm.assigned_at, mm.status as mentorship_status,
        rp.current_streak, rp.start_date
      FROM mentor_mentees mm
      JOIN users u ON mm.mentee_id = u.id
      LEFT JOIN recovery_programs rp ON u.id = rp.user_id AND rp.status = 'active'
      WHERE mm.mentor_id = $1 AND mm.status = 'active'
      ORDER BY mm.assigned_at DESC
    `;
    
    const mentees = await pool.query(menteesQuery, [mentorInfo.id]);
    
    // Get recent activities
    const activitiesQuery = `
      SELECT 
        ma.activity_type, ma.description, ma.points_earned, ma.created_at,
        u.first_name as mentee_name
      FROM mentor_activities ma
      LEFT JOIN mentor_mentees mm ON ma.mentee_id = mm.mentee_id AND mm.mentor_id = ma.mentor_id
      LEFT JOIN users u ON mm.mentee_id = u.id
      WHERE ma.mentor_id = $1
      ORDER BY ma.created_at DESC
      LIMIT 20
    `;
    
    const activities = await pool.query(activitiesQuery, [mentorInfo.id]);
    
    // Check free access eligibility
    const freeAccessStatus = await checkFreeAccessEligibility(mentorInfo.id);
    
    res.json({
      mentor: {
        ...mentorInfo,
        statistics: stats,
        freeAccessStatus: freeAccessStatus
      },
      mentees: mentees.rows.map(mentee => DataFilter.filterUserData(mentee, {
        includeEmail: false,
        requesterRole: 'mentor'
      })),
      recentActivities: activities.rows,
      engagement: {
        thisMonth: stats.thisMonthActivities,
        required: MENTOR_CONFIG.minMonthlyActivitiesForFreeAccess,
        isEligibleForFreeAccess: freeAccessStatus.isEligible
      }
    });

  } catch (error) {
    console.error('Mentor dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch mentor dashboard' });
  }
});

// Log mentor activity
router.post('/activity', authenticateToken, async (req, res) => {
  try {
    const { activityType, description, menteeId, metadata } = req.body;
    
    // Verify user is an active mentor
    const mentorQuery = `
      SELECT id FROM mentors WHERE user_id = $1 AND status = 'active'
    `;
    const mentor = await pool.query(mentorQuery, [req.user.id]);
    
    if (mentor.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Not an active mentor' });
    }
    
    const mentorId = mentor.rows[0].id;
    
    // Verify activity type is valid
    if (!MENTOR_CONFIG.engagementActivities.includes(activityType)) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }
    
    // Calculate points for activity
    const points = calculateActivityPoints(activityType);
    
    // Log the activity
    const activityQuery = `
      INSERT INTO mentor_activities (
        mentor_id, mentee_id, activity_type, description, 
        points_earned, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    
    const activity = await pool.query(activityQuery, [
      mentorId,
      menteeId,
      activityType,
      description,
      points,
      JSON.stringify(metadata || {})
    ]);
    
    // Update mentor's total points
    await pool.query(
      `UPDATE mentors SET total_points = COALESCE(total_points, 0) + $1 WHERE id = $2`,
      [points, mentorId]
    );
    
    // Check if this activity qualifies for free access
    await updateFreeAccessStatus(mentorId);
    
    res.json({
      activityId: activity.rows[0].id,
      pointsEarned: points,
      message: 'Activity logged successfully'
    });

  } catch (error) {
    console.error('Log mentor activity error:', error);
    res.status(500).json({ error: 'Failed to log mentor activity' });
  }
});

// Get available mentees for assignment
router.get('/available-mentees', authenticateToken, async (req, res) => {
  try {
    // Verify user is an active mentor
    const mentorQuery = `
      SELECT id FROM mentors WHERE user_id = $1 AND status = 'active'
    `;
    const mentor = await pool.query(mentorQuery, [req.user.id]);
    
    if (mentor.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Not an active mentor' });
    }
    
    // Get users who need mentors (30+ days, no current mentor)
    const availableQuery = `
      SELECT 
        u.id, u.first_name, u.username, u.created_at,
        rp.current_streak, rp.start_date, at.name as addiction_type
      FROM users u
      JOIN recovery_programs rp ON u.id = rp.user_id AND rp.status = 'active'
      JOIN addiction_types at ON rp.addiction_type_id = at.id
      WHERE u.id NOT IN (
        SELECT mentee_id FROM mentor_mentees WHERE status = 'active'
      )
      AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400 >= 30
      AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rp.start_date))/86400 < 365
      AND u.is_active = true
      ORDER BY rp.start_date ASC
      LIMIT 50
    `;
    
    const available = await pool.query(availableQuery);
    
    res.json({
      availableMentees: available.rows.map(mentee => DataFilter.filterUserData(mentee, {
        includeEmail: false,
        requesterRole: 'mentor'
      }))
    });

  } catch (error) {
    console.error('Get available mentees error:', error);
    res.status(500).json({ error: 'Failed to fetch available mentees' });
  }
});

// Assign mentee to mentor
router.post('/assign-mentee', authenticateToken, async (req, res) => {
  try {
    const { menteeId } = req.body;
    
    // Verify user is an active mentor
    const mentorQuery = `
      SELECT id FROM mentors WHERE user_id = $1 AND status = 'active'
    `;
    const mentor = await pool.query(mentorQuery, [req.user.id]);
    
    if (mentor.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Not an active mentor' });
    }
    
    const mentorId = mentor.rows[0].id;
    
    // Check if mentee is available
    const menteeCheck = `
      SELECT id FROM users 
      WHERE id = $1 
      AND id NOT IN (SELECT mentee_id FROM mentor_mentees WHERE status = 'active')
    `;
    const menteeExists = await pool.query(menteeCheck, [menteeId]);
    
    if (menteeExists.rows.length === 0) {
      return res.status(400).json({ error: 'Mentee not available for assignment' });
    }
    
    // Create mentorship relationship
    const assignmentQuery = `
      INSERT INTO mentor_mentees (mentor_id, mentee_id, assigned_at, status)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 'active')
      RETURNING id
    `;
    
    const assignment = await pool.query(assignmentQuery, [mentorId, menteeId]);
    
    // Log the assignment activity
    await pool.query(
      `INSERT INTO mentor_activities (
        mentor_id, mentee_id, activity_type, description, points_earned
      ) VALUES ($1, $2, 'mentee_assignment', 'New mentee assigned', 50)`,
      [mentorId, menteeId]
    );
    
    // Update mentor points
    await pool.query(
      `UPDATE mentors SET total_points = COALESCE(total_points, 0) + 50 WHERE id = $1`,
      [mentorId]
    );
    
    res.json({
      assignmentId: assignment.rows[0].id,
      message: 'Mentee assigned successfully',
      pointsEarned: 50
    });

  } catch (error) {
    console.error('Assign mentee error:', error);
    res.status(500).json({ error: 'Failed to assign mentee' });
  }
});

// Helper functions
async function getMentorStatistics(mentorId) {
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT mm.mentee_id) as total_mentees,
      COUNT(DISTINCT CASE WHEN mm.status = 'active' THEN mm.mentee_id END) as active_mentees,
      COUNT(DISTINCT CASE WHEN ma.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN ma.id END) as this_month_activities,
      COUNT(DISTINCT ma.id) as total_activities,
      COALESCE(SUM(ma.points_earned), 0) as total_points,
      COUNT(DISTINCT CASE WHEN ma.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN ma.id END) as this_week_activities
    FROM mentors m
    LEFT JOIN mentor_mentees mm ON m.id = mm.mentor_id
    LEFT JOIN mentor_activities ma ON m.id = ma.mentor_id
    WHERE m.id = $1
    GROUP BY m.id
  `;
  
  const stats = await pool.query(statsQuery, [mentorId]);
  return stats.rows[0] || {
    total_mentees: 0,
    active_mentees: 0,
    this_month_activities: 0,
    total_activities: 0,
    total_points: 0,
    this_week_activities: 0
  };
}

async function checkFreeAccessEligibility(mentorId) {
  const mentor = await pool.query(
    `SELECT 
      m.created_at as mentor_since,
      ms.subscription_type, ms.expires_at, ms.is_lifetime, ms.free_access_earned
    FROM mentors m
    LEFT JOIN mentor_subscriptions ms ON m.id = ms.mentor_id
    WHERE m.id = $1`,
    [mentorId]
  );
  
  const mentorInfo = mentor.rows[0];
  const stats = await getMentorStatistics(mentorId);
  
  // Check if eligible for free access
  const hasEnoughMentees = stats.active_mentees >= MENTOR_CONFIG.minMenteesForFreeAccess;
  const hasEnoughActivity = stats.this_month_activities >= MENTOR_CONFIG.minMonthlyActivitiesForFreeAccess;
  const isEligible = hasEnoughMentees && hasEnoughActivity;
  
  // Check lifetime membership eligibility (2 years of active mentoring)
  const mentorDays = Math.floor((new Date() - new Date(mentorInfo.mentor_since)) / (1000 * 60 * 60 * 24));
  const isLifetimeEligible = mentorDays >= MENTOR_CONFIG.lifetimeMembershipDays && 
                             stats.total_activities >= 240; // ~10 activities per month for 2 years
  
  return {
    isEligible,
    isLifetimeEligible,
    hasEnoughMentees,
    hasEnoughActivity,
    currentMentees: stats.active_mentees,
    requiredMentees: MENTOR_CONFIG.minMenteesForFreeAccess,
    currentActivity: stats.this_month_activities,
    requiredActivity: MENTOR_CONFIG.minMonthlyActivitiesForFreeAccess,
    mentorDays,
    totalActivities: stats.total_activities
  };
}

async function updateFreeAccessStatus(mentorId) {
  const eligibility = await checkFreeAccessEligibility(mentorId);
  
  if (eligibility.isLifetimeEligible) {
    // Grant lifetime membership
    await pool.query(
      `INSERT INTO mentor_subscriptions (mentor_id, subscription_type, is_lifetime, free_access_earned, granted_at)
       VALUES ($1, 'lifetime', true, true, CURRENT_TIMESTAMP)
       ON CONFLICT (mentor_id) DO UPDATE SET
       subscription_type = 'lifetime', is_lifetime = true, free_access_earned = true`,
      [mentorId]
    );
  } else if (eligibility.isEligible) {
    // Grant/extend free access for current month
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    
    await pool.query(
      `INSERT INTO mentor_subscriptions (mentor_id, subscription_type, expires_at, free_access_earned, granted_at)
       VALUES ($1, 'premium', $2, true, CURRENT_TIMESTAMP)
       ON CONFLICT (mentor_id) DO UPDATE SET
       subscription_type = 'premium', expires_at = $2, free_access_earned = true`,
      [mentorId, expiresAt]
    );
  }
}

function calculateActivityPoints(activityType) {
  const pointsMap = {
    'mentee_message': 2,
    'group_help': 5,
    'crisis_response': 15,
    'challenge_support': 3,
    'milestone_celebration': 8,
    'community_post': 3,
    'wisdom_share': 10,
    'mentee_assignment': 50
  };
  
  return pointsMap[activityType] || 1;
}

module.exports = router;