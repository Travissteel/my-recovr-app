/**
 * Subscription Management Routes
 * Handles Stripe integration, subscription management, and payment processing
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { 
  stripe, 
  SUBSCRIPTION_PLANS, 
  createCustomer, 
  createSubscription, 
  createPaymentSession, 
  createSubscriptionSession, 
  cancelSubscription, 
  getCustomerSubscriptions, 
  createBillingPortalSession 
} = require('../config/stripe');
const { auditLog } = require('../utils/securityAudit');

// Get subscription plans
router.get('/plans', (req, res) => {
  try {
    res.json({
      success: true,
      plans: SUBSCRIPTION_PLANS
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription plans',
      error: error.message
    });
  }
});

// Get current user subscription
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user subscription info
    const userQuery = `
      SELECT subscription_plan, subscription_status, subscription_ends_at, 
             trial_ends_at, lifetime_access, stripe_customer_id
      FROM users WHERE id = $1
    `;
    const userResult = await db.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Get active subscription from database
    const subQuery = `
      SELECT * FROM subscriptions 
      WHERE user_id = $1 AND status IN ('active', 'trialing') 
      ORDER BY created_at DESC LIMIT 1
    `;
    const subResult = await db.query(subQuery, [userId]);

    let stripeSubscription = null;
    if (user.stripe_customer_id && subResult.rows.length > 0) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          subResult.rows[0].stripe_subscription_id
        );
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    res.json({
      success: true,
      subscription: {
        plan: user.subscription_plan,
        status: user.subscription_status,
        ends_at: user.subscription_ends_at,
        trial_ends_at: user.trial_ends_at,
        lifetime_access: user.lifetime_access,
        stripe_subscription: stripeSubscription,
        local_subscription: subResult.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Error getting current subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current subscription',
      error: error.message
    });
  }
});

// Create checkout session for subscription
router.post('/checkout/subscription', [
  authenticateToken,
  body('plan').isIn(['premium_monthly', 'premium_yearly', 'professional']).withMessage('Invalid subscription plan'),
  body('trial_days').optional().isInt({ min: 0, max: 30 }).withMessage('Trial days must be between 0 and 30')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { plan, trial_days = 0 } = req.body;

    // Get user info
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);
    const user = userResult.rows[0];

    // Check if user already has an active subscription
    if (user.subscription_plan !== 'free' && user.subscription_status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription'
      });
    }

    // Create or get Stripe customer
    let stripeCustomer;
    if (user.stripe_customer_id) {
      stripeCustomer = await stripe.customers.retrieve(user.stripe_customer_id);
    } else {
      stripeCustomer = await createCustomer(user);
      
      // Update user with Stripe customer ID
      await db.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomer.id, userId]
      );
    }

    // Get price ID for the plan
    const priceId = SUBSCRIPTION_PLANS[plan.toUpperCase()].stripe_price_id;
    
    // Create checkout session
    const session = await createSubscriptionSession(
      stripeCustomer.id,
      priceId,
      `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      `${process.env.FRONTEND_URL}/subscription/cancel`,
      trial_days
    );

    // Log subscription attempt
    await auditLog(userId, 'subscription_checkout_created', `Checkout session created for ${plan} plan`, {
      session_id: session.id,
      plan: plan,
      trial_days: trial_days
    });

    res.json({
      success: true,
      session_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription checkout',
      error: error.message
    });
  }
});

// Create checkout session for lifetime access
router.post('/checkout/lifetime', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user info
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);
    const user = userResult.rows[0];

    // Check if user already has lifetime access
    if (user.lifetime_access) {
      return res.status(400).json({
        success: false,
        message: 'User already has lifetime access'
      });
    }

    // Create or get Stripe customer
    let stripeCustomer;
    if (user.stripe_customer_id) {
      stripeCustomer = await stripe.customers.retrieve(user.stripe_customer_id);
    } else {
      stripeCustomer = await createCustomer(user);
      
      // Update user with Stripe customer ID
      await db.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomer.id, userId]
      );
    }

    // Create payment session for lifetime access
    const session = await createPaymentSession(
      stripeCustomer.id,
      SUBSCRIPTION_PLANS.LIFETIME.stripe_price_id,
      `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      `${process.env.FRONTEND_URL}/subscription/cancel`
    );

    // Log lifetime purchase attempt
    await auditLog(userId, 'lifetime_checkout_created', 'Lifetime access checkout session created', {
      session_id: session.id
    });

    res.json({
      success: true,
      session_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Error creating lifetime checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lifetime checkout',
      error: error.message
    });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's active subscription
    const subQuery = `
      SELECT * FROM subscriptions 
      WHERE user_id = $1 AND status IN ('active', 'trialing') 
      ORDER BY created_at DESC LIMIT 1
    `;
    const subResult = await db.query(subQuery, [userId]);

    if (subResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const subscription = subResult.rows[0];

    // Cancel subscription in Stripe
    await cancelSubscription(subscription.stripe_subscription_id);

    // Update subscription status in database
    await db.query(
      'UPDATE subscriptions SET status = $1, canceled_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['canceled', subscription.id]
    );

    // Update user subscription status
    await db.query(
      'UPDATE users SET subscription_status = $1 WHERE id = $2',
      ['canceled', userId]
    );

    // Log cancellation
    await auditLog(userId, 'subscription_canceled', 'Subscription canceled by user', {
      subscription_id: subscription.id,
      plan_type: subscription.plan_type
    });

    res.json({
      success: true,
      message: 'Subscription canceled successfully'
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
});

// Get billing portal session
router.post('/billing-portal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's Stripe customer ID
    const userQuery = 'SELECT stripe_customer_id FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);
    const user = userResult.rows[0];

    if (!user.stripe_customer_id) {
      return res.status(404).json({
        success: false,
        message: 'No billing information found'
      });
    }

    // Create billing portal session
    const session = await createBillingPortalSession(
      user.stripe_customer_id,
      `${process.env.FRONTEND_URL}/settings/billing`
    );

    res.json({
      success: true,
      session_url: session.url
    });

  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create billing portal session',
      error: error.message
    });
  }
});

// Get payment history
router.get('/payment-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM payment_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [userId, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM payment_history WHERE user_id = $1';
    const countResult = await db.query(countQuery, [userId]);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      payments: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: error.message
    });
  }
});

module.exports = router;