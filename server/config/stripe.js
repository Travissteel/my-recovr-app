/**
 * Stripe Configuration
 * Payment processing setup for RecovR platform
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// RecovR Subscription Plans
const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      'Basic recovery tracking',
      'Limited community access',
      'Standard educational content',
      'Basic blocking tools'
    ]
  },
  PREMIUM_MONTHLY: {
    name: 'Premium Monthly',
    price: 999, // $9.99 in cents
    interval: 'month',
    stripe_price_id: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    features: [
      'Advanced analytics and insights',
      'Unlimited community features',
      'Priority customer support',
      'AI-powered blocking and filtering',
      'Personalized coaching recommendations',
      'Multi-addiction support',
      'Crisis intervention system'
    ]
  },
  PREMIUM_YEARLY: {
    name: 'Premium Yearly',
    price: 10000, // $100.00 in cents
    interval: 'year',
    stripe_price_id: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    features: [
      'All Premium Monthly features',
      '2 months free (16% savings)',
      'Annual progress reports',
      'Priority feature requests'
    ]
  },
  LIFETIME: {
    name: 'Early Adopter Lifetime',
    price: 15000, // $150.00 in cents
    interval: 'one_time',
    stripe_price_id: process.env.STRIPE_LIFETIME_PRICE_ID,
    features: [
      'All premium features forever',
      'No recurring billing',
      'Exclusive early adopter badge',
      'Direct feedback channel',
      'All future premium features',
      'Limited time offer'
    ]
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 1999, // $19.99 in cents
    interval: 'month',
    stripe_price_id: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    features: [
      'All Premium features',
      'Therapist/coach dashboard',
      'Multiple client management',
      'AI chatbot with addiction knowledgebase',
      'Advanced reporting tools',
      'Professional resource library',
      'Exclusive professional guests monthly Q&A'
    ]
  }
};

// Create Stripe customer
const createCustomer = async (user) => {
  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      metadata: {
        user_id: user.id,
        username: user.username
      }
    });
    return customer;
  } catch (error) {
    throw new Error(`Failed to create Stripe customer: ${error.message}`);
  }
};

// Create subscription
const createSubscription = async (customerId, priceId, trialDays = 0) => {
  try {
    const subscriptionData = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    };

    if (trialDays > 0) {
      subscriptionData.trial_period_days = trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);
    return subscription;
  } catch (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }
};

// Create one-time payment session
const createPaymentSession = async (customerId, priceId, successUrl, cancelUrl) => {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan_type: 'lifetime'
      }
    });
    return session;
  } catch (error) {
    throw new Error(`Failed to create payment session: ${error.message}`);
  }
};

// Create subscription checkout session
const createSubscriptionSession = async (customerId, priceId, successUrl, cancelUrl, trialDays = 0) => {
  try {
    const sessionData = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          plan_type: priceId === SUBSCRIPTION_PLANS.PREMIUM_MONTHLY.stripe_price_id ? 'premium_monthly' : 'premium_yearly'
        }
      }
    };

    if (trialDays > 0) {
      sessionData.subscription_data.trial_period_days = trialDays;
    }

    const session = await stripe.checkout.sessions.create(sessionData);
    return session;
  } catch (error) {
    throw new Error(`Failed to create subscription session: ${error.message}`);
  }
};

// Cancel subscription
const cancelSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.del(subscriptionId);
    return subscription;
  } catch (error) {
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
};

// Get customer subscriptions
const getCustomerSubscriptions = async (customerId) => {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all'
    });
    return subscriptions.data;
  } catch (error) {
    throw new Error(`Failed to get customer subscriptions: ${error.message}`);
  }
};

// Update subscription
const updateSubscription = async (subscriptionId, updates) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, updates);
    return subscription;
  } catch (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
};

// Get payment methods
const getPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    return paymentMethods.data;
  } catch (error) {
    throw new Error(`Failed to get payment methods: ${error.message}`);
  }
};

// Create billing portal session
const createBillingPortalSession = async (customerId, returnUrl) => {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
    return session;
  } catch (error) {
    throw new Error(`Failed to create billing portal session: ${error.message}`);
  }
};

module.exports = {
  stripe,
  SUBSCRIPTION_PLANS,
  createCustomer,
  createSubscription,
  createPaymentSession,
  createSubscriptionSession,
  cancelSubscription,
  getCustomerSubscriptions,
  updateSubscription,
  getPaymentMethods,
  createBillingPortalSession
};