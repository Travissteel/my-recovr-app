/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events for payment processing and subscription updates
 */

const express = require('express');
const router = express.Router();
const { stripe } = require('../config/stripe');
const db = require('../database/connection');
const { auditLog } = require('../utils/securityAudit');

// Webhook endpoint for Stripe events
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Get user by Stripe customer ID
    const userQuery = 'SELECT * FROM users WHERE stripe_customer_id = $1';
    const userResult = await db.query(userQuery, [customerId]);
    
    if (userResult.rows.length === 0) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const user = userResult.rows[0];
    const planType = getPlanTypeFromPriceId(subscription.items.data[0].price.id);

    // Insert subscription record
    await db.query(`
      INSERT INTO subscriptions (
        user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id,
        plan_type, status, current_period_start, current_period_end,
        trial_start, trial_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      user.id,
      subscription.id,
      customerId,
      subscription.items.data[0].price.id,
      planType,
      subscription.status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    ]);

    // Update user subscription status
    await db.query(`
      UPDATE users SET 
        subscription_plan = $1, 
        subscription_status = $2,
        subscription_ends_at = $3,
        trial_ends_at = $4
      WHERE id = $5
    `, [
      planType,
      subscription.status,
      new Date(subscription.current_period_end * 1000),
      subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      user.id
    ]);

    // Log subscription creation
    await auditLog(user.id, 'subscription_created', `Subscription created for ${planType} plan`, {
      subscription_id: subscription.id,
      plan_type: planType,
      status: subscription.status
    });

    console.log(`Subscription created for user ${user.id}: ${planType}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Get user by Stripe customer ID
    const userQuery = 'SELECT * FROM users WHERE stripe_customer_id = $1';
    const userResult = await db.query(userQuery, [customerId]);
    
    if (userResult.rows.length === 0) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const user = userResult.rows[0];
    const planType = getPlanTypeFromPriceId(subscription.items.data[0].price.id);

    // Update subscription record
    await db.query(`
      UPDATE subscriptions SET
        status = $1,
        current_period_start = $2,
        current_period_end = $3,
        trial_start = $4,
        trial_end = $5,
        canceled_at = $6,
        cancel_at_period_end = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = $8
    `, [
      subscription.status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      subscription.cancel_at_period_end,
      subscription.id
    ]);

    // Update user subscription status
    await db.query(`
      UPDATE users SET 
        subscription_plan = $1, 
        subscription_status = $2,
        subscription_ends_at = $3,
        trial_ends_at = $4
      WHERE id = $5
    `, [
      planType,
      subscription.status,
      new Date(subscription.current_period_end * 1000),
      subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      user.id
    ]);

    // Log subscription update
    await auditLog(user.id, 'subscription_updated', `Subscription updated to ${subscription.status}`, {
      subscription_id: subscription.id,
      plan_type: planType,
      status: subscription.status
    });

    console.log(`Subscription updated for user ${user.id}: ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Get user by Stripe customer ID
    const userQuery = 'SELECT * FROM users WHERE stripe_customer_id = $1';
    const userResult = await db.query(userQuery, [customerId]);
    
    if (userResult.rows.length === 0) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const user = userResult.rows[0];

    // Update subscription record
    await db.query(`
      UPDATE subscriptions SET
        status = 'canceled',
        canceled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = $1
    `, [subscription.id]);

    // Update user to free plan
    await db.query(`
      UPDATE users SET 
        subscription_plan = 'free', 
        subscription_status = 'canceled',
        subscription_ends_at = NULL,
        trial_ends_at = NULL
      WHERE id = $1
    `, [user.id]);

    // Log subscription deletion
    await auditLog(user.id, 'subscription_deleted', 'Subscription canceled/deleted', {
      subscription_id: subscription.id
    });

    console.log(`Subscription deleted for user ${user.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

// Handle successful payment
async function handlePaymentSucceeded(invoice) {
  try {
    const customerId = invoice.customer;
    
    // Get user by Stripe customer ID
    const userQuery = 'SELECT * FROM users WHERE stripe_customer_id = $1';
    const userResult = await db.query(userQuery, [customerId]);
    
    if (userResult.rows.length === 0) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const user = userResult.rows[0];

    // Get subscription if exists
    let subscriptionId = null;
    if (invoice.subscription) {
      const subQuery = 'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1';
      const subResult = await db.query(subQuery, [invoice.subscription]);
      if (subResult.rows.length > 0) {
        subscriptionId = subResult.rows[0].id;
      }
    }

    // Record payment
    await db.query(`
      INSERT INTO payment_history (
        user_id, subscription_id, stripe_payment_intent_id, stripe_invoice_id,
        amount, currency, payment_method, status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      user.id,
      subscriptionId,
      invoice.payment_intent,
      invoice.id,
      invoice.amount_paid,
      invoice.currency,
      invoice.payment_method_types?.[0] || 'card',
      'succeeded',
      invoice.description || 'Subscription payment'
    ]);

    // Log payment success
    await auditLog(user.id, 'payment_succeeded', 'Payment processed successfully', {
      invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency
    });

    console.log(`Payment succeeded for user ${user.id}: ${invoice.amount_paid} ${invoice.currency}`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
  try {
    const customerId = invoice.customer;
    
    // Get user by Stripe customer ID
    const userQuery = 'SELECT * FROM users WHERE stripe_customer_id = $1';
    const userResult = await db.query(userQuery, [customerId]);
    
    if (userResult.rows.length === 0) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const user = userResult.rows[0];

    // Get subscription if exists
    let subscriptionId = null;
    if (invoice.subscription) {
      const subQuery = 'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1';
      const subResult = await db.query(subQuery, [invoice.subscription]);
      if (subResult.rows.length > 0) {
        subscriptionId = subResult.rows[0].id;
      }
    }

    // Record failed payment
    await db.query(`
      INSERT INTO payment_history (
        user_id, subscription_id, stripe_payment_intent_id, stripe_invoice_id,
        amount, currency, payment_method, status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      user.id,
      subscriptionId,
      invoice.payment_intent,
      invoice.id,
      invoice.amount_due,
      invoice.currency,
      invoice.payment_method_types?.[0] || 'card',
      'failed',
      invoice.description || 'Subscription payment failed'
    ]);

    // Log payment failure
    await auditLog(user.id, 'payment_failed', 'Payment failed', {
      invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency
    });

    console.log(`Payment failed for user ${user.id}: ${invoice.amount_due} ${invoice.currency}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

// Handle checkout session completed
async function handleCheckoutCompleted(session) {
  try {
    const customerId = session.customer;
    
    // Get user by Stripe customer ID
    const userQuery = 'SELECT * FROM users WHERE stripe_customer_id = $1';
    const userResult = await db.query(userQuery, [customerId]);
    
    if (userResult.rows.length === 0) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const user = userResult.rows[0];

    // Check if this is a lifetime purchase
    if (session.metadata?.plan_type === 'lifetime') {
      // Update user to lifetime access
      await db.query(`
        UPDATE users SET 
          subscription_plan = 'lifetime', 
          subscription_status = 'active',
          lifetime_access = true,
          subscription_ends_at = NULL,
          trial_ends_at = NULL
        WHERE id = $1
      `, [user.id]);

      // Record payment for lifetime access
      await db.query(`
        INSERT INTO payment_history (
          user_id, stripe_payment_intent_id, amount, currency, 
          payment_method, status, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        user.id,
        session.payment_intent,
        session.amount_total,
        session.currency,
        'card',
        'succeeded',
        'Lifetime access purchase'
      ]);

      // Log lifetime purchase
      await auditLog(user.id, 'lifetime_purchase', 'Lifetime access purchased', {
        session_id: session.id,
        amount: session.amount_total
      });

      console.log(`Lifetime access purchased for user ${user.id}`);
    }

    // Log checkout completion
    await auditLog(user.id, 'checkout_completed', 'Checkout session completed', {
      session_id: session.id,
      payment_status: session.payment_status
    });

  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

// Handle trial will end
async function handleTrialWillEnd(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Get user by Stripe customer ID
    const userQuery = 'SELECT * FROM users WHERE stripe_customer_id = $1';
    const userResult = await db.query(userQuery, [customerId]);
    
    if (userResult.rows.length === 0) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const user = userResult.rows[0];

    // Log trial ending
    await auditLog(user.id, 'trial_will_end', 'Trial period will end soon', {
      subscription_id: subscription.id,
      trial_end: new Date(subscription.trial_end * 1000)
    });

    // TODO: Send trial ending notification email
    console.log(`Trial will end for user ${user.id}`);
  } catch (error) {
    console.error('Error handling trial will end:', error);
  }
}

// Helper function to get plan type from price ID
function getPlanTypeFromPriceId(priceId) {
  const { SUBSCRIPTION_PLANS } = require('../config/stripe');
  
  if (priceId === SUBSCRIPTION_PLANS.PREMIUM_MONTHLY.stripe_price_id) {
    return 'premium_monthly';
  } else if (priceId === SUBSCRIPTION_PLANS.PREMIUM_YEARLY.stripe_price_id) {
    return 'premium_yearly';
  } else if (priceId === SUBSCRIPTION_PLANS.LIFETIME.stripe_price_id) {
    return 'lifetime';
  } else if (priceId === SUBSCRIPTION_PLANS.PROFESSIONAL.stripe_price_id) {
    return 'professional';
  }
  
  return 'unknown';
}

module.exports = router;