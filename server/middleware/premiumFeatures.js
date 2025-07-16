/**
 * Premium Features Middleware
 * Controls access to premium features based on user subscription status
 */

const db = require('../database/connection');
const { auditLog } = require('../utils/securityAudit');

// Check if user has premium access
const hasPremiumAccess = (user) => {
  const premiumPlans = ['premium_monthly', 'premium_yearly', 'lifetime', 'professional'];
  return premiumPlans.includes(user.subscription_plan) && 
         (user.subscription_status === 'active' || user.lifetime_access);
};

// Check if user is in trial period
const isInTrialPeriod = (user) => {
  if (!user.trial_ends_at) return false;
  return new Date() < new Date(user.trial_ends_at);
};

// Get user's subscription status
const getUserSubscriptionStatus = async (userId) => {
  const query = `
    SELECT subscription_plan, subscription_status, subscription_ends_at, 
           trial_ends_at, lifetime_access
    FROM users WHERE id = $1
  `;
  const result = await db.query(query, [userId]);
  return result.rows[0];
};

// Middleware to require premium access
const requirePremium = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await getUserSubscriptionStatus(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has premium access or is in trial
    if (hasPremiumAccess(user) || isInTrialPeriod(user)) {
      req.user.subscription = user;
      return next();
    }

    // Log premium access attempt
    await auditLog(userId, 'premium_access_denied', 'Premium feature access denied', {
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      endpoint: req.originalUrl
    });

    return res.status(403).json({
      success: false,
      message: 'Premium subscription required',
      subscription_required: true,
      current_plan: user.subscription_plan,
      upgrade_url: '/subscription/plans'
    });

  } catch (error) {
    console.error('Error checking premium access:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking subscription status'
    });
  }
};

// Middleware to check premium access without blocking
const checkPremiumAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await getUserSubscriptionStatus(userId);

    if (user) {
      req.user.subscription = user;
      req.user.isPremium = hasPremiumAccess(user) || isInTrialPeriod(user);
      req.user.isTrialing = isInTrialPeriod(user);
      req.user.hasLifetimeAccess = user.lifetime_access;
    } else {
      req.user.isPremium = false;
      req.user.isTrialing = false;
      req.user.hasLifetimeAccess = false;
    }

    next();
  } catch (error) {
    console.error('Error checking premium access:', error);
    req.user.isPremium = false;
    req.user.isTrialing = false;
    req.user.hasLifetimeAccess = false;
    next();
  }
};

// Feature limits for free users
const FREE_USER_LIMITS = {
  // Community features
  max_groups_joined: 3,
  max_messages_per_day: 50,
  max_posts_per_day: 5,
  
  // Recovery tracking
  max_programs: 2,
  max_check_ins_per_day: 3,
  
  // Gamification
  max_daily_challenges: 3,
  achievements_visible: 10,
  
  // Content blocking
  max_blocked_sites: 20,
  max_blocked_keywords: 50,
  
  // Crisis support
  max_crisis_contacts: 3,
  
  // Analytics
  analytics_history_days: 30,
  
  // Mentorship
  mentor_program_access: false,
  
  // AI features
  chatbot_messages_per_day: 10
};

// Check if user has exceeded free tier limits
const checkFeatureLimit = (limitType, currentUsage, user) => {
  // Premium users have no limits
  if (hasPremiumAccess(user) || isInTrialPeriod(user)) {
    return { allowed: true, limit: null };
  }

  const limit = FREE_USER_LIMITS[limitType];
  if (limit === undefined) {
    return { allowed: true, limit: null };
  }

  if (typeof limit === 'boolean') {
    return { allowed: limit, limit: limit };
  }

  return {
    allowed: currentUsage < limit,
    limit: limit,
    current: currentUsage
  };
};

// Middleware to check specific feature limits
const checkLimit = (limitType, getCurrentUsage) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const user = await getUserSubscriptionStatus(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get current usage
      const currentUsage = await getCurrentUsage(userId);
      const limitCheck = checkFeatureLimit(limitType, currentUsage, user);

      if (!limitCheck.allowed) {
        await auditLog(userId, 'feature_limit_exceeded', `Feature limit exceeded: ${limitType}`, {
          limit_type: limitType,
          current_usage: currentUsage,
          limit: limitCheck.limit
        });

        return res.status(429).json({
          success: false,
          message: `Feature limit exceeded`,
          limit_type: limitType,
          current_usage: currentUsage,
          limit: limitCheck.limit,
          subscription_required: true,
          upgrade_url: '/subscription/plans'
        });
      }

      req.user.subscription = user;
      req.user.featureLimit = limitCheck;
      next();

    } catch (error) {
      console.error('Error checking feature limit:', error);
      next(); // Allow request to continue on error
    }
  };
};

// Helper functions to get current usage
const getCurrentUsage = {
  // Get number of groups user has joined
  max_groups_joined: async (userId) => {
    const query = 'SELECT COUNT(*) FROM group_memberships WHERE user_id = $1 AND status = $2';
    const result = await db.query(query, [userId, 'active']);
    return parseInt(result.rows[0].count);
  },

  // Get messages sent today
  max_messages_per_day: async (userId) => {
    const query = `
      SELECT COUNT(*) FROM messages 
      WHERE sender_id = $1 AND DATE(created_at) = CURRENT_DATE
    `;
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  },

  // Get posts created today
  max_posts_per_day: async (userId) => {
    const query = `
      SELECT COUNT(*) FROM community_posts 
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `;
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  },

  // Get number of active recovery programs
  max_programs: async (userId) => {
    const query = 'SELECT COUNT(*) FROM recovery_programs WHERE user_id = $1 AND status = $2';
    const result = await db.query(query, [userId, 'active']);
    return parseInt(result.rows[0].count);
  },

  // Get check-ins today
  max_check_ins_per_day: async (userId) => {
    const query = `
      SELECT COUNT(*) FROM daily_checkins 
      WHERE user_id = $1 AND DATE(checkin_date) = CURRENT_DATE
    `;
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  },

  // Get chatbot messages today
  chatbot_messages_per_day: async (userId) => {
    const query = `
      SELECT COUNT(*) FROM chatbot_conversations 
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `;
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }
};

module.exports = {
  requirePremium,
  checkPremiumAccess,
  checkLimit,
  getCurrentUsage,
  checkFeatureLimit,
  hasPremiumAccess,
  isInTrialPeriod,
  FREE_USER_LIMITS
};