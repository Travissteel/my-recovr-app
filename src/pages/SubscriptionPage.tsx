import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SimpleNotificationToast from '../components/SimpleNotificationToast';

interface SubscriptionPlan {
  name: string;
  price: number;
  interval?: string;
  features: string[];
  stripe_price_id?: string;
}

interface SubscriptionPlans {
  FREE: SubscriptionPlan;
  PREMIUM_MONTHLY: SubscriptionPlan;
  PREMIUM_YEARLY: SubscriptionPlan;
  LIFETIME: SubscriptionPlan;
}

interface CurrentSubscription {
  plan: string;
  status: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  lifetime_access: boolean;
}

const SubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlans | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Load subscription plans
      const plansResponse = await api.get('/subscriptions/plans');
      setPlans(plansResponse.data.plans);

      // Load current subscription
      const currentResponse = await api.get('/subscriptions/current');
      setCurrentSubscription(currentResponse.data.subscription);

    } catch (error) {
      console.error('Error loading subscription data:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load subscription information'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    try {
      setActionLoading(true);
      
      let response;
      if (planType === 'lifetime') {
        response = await api.post('/subscriptions/checkout/lifetime');
      } else {
        response = await api.post('/subscriptions/checkout/subscription', {
          plan: planType
        });
      }

      // Redirect to Stripe checkout
      window.location.href = response.data.session_url;

    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create checkout session'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/subscriptions/cancel');
      
      setNotification({
        type: 'success',
        message: 'Subscription canceled successfully'
      });
      
      // Reload subscription data
      await loadSubscriptionData();

    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to cancel subscription'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/subscriptions/billing-portal');
      
      // Redirect to Stripe billing portal
      window.location.href = response.data.session_url;

    } catch (error: any) {
      console.error('Error creating billing portal session:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to access billing portal'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2);
  };

  const isCurrentPlan = (planType: string) => {
    return currentSubscription?.plan === planType;
  };

  const canUpgrade = (planType: string) => {
    if (!currentSubscription) return true;
    
    const currentPlan = currentSubscription.plan;
    
    // If user has lifetime access, they can't upgrade
    if (currentSubscription.lifetime_access) return false;
    
    // If current plan is free, can upgrade to anything
    if (currentPlan === 'free') return true;
    
    // If current plan is monthly, can upgrade to yearly or lifetime
    if (currentPlan === 'premium_monthly') {
      return planType === 'premium_yearly' || planType === 'lifetime';
    }
    
    // If current plan is yearly, can only upgrade to lifetime
    if (currentPlan === 'premium_yearly') {
      return planType === 'lifetime';
    }
    
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!plans) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Failed to load subscription plans
          </h2>
          <button
            onClick={loadSubscriptionData}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your RecovR Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Unlock the full potential of your recovery journey with premium features
          </p>
        </div>

        {/* Current Subscription Status */}
        {currentSubscription && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Current Subscription
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {currentSubscription.plan.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <p className={`text-lg font-semibold capitalize ${
                  currentSubscription.status === 'active' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentSubscription.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentSubscription.lifetime_access ? 'Access' : 'Renews'}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentSubscription.lifetime_access ? 'Lifetime' : 
                   currentSubscription.ends_at ? new Date(currentSubscription.ends_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Subscription Management Buttons */}
            <div className="mt-6 flex flex-wrap gap-4">
              {currentSubscription.plan !== 'free' && !currentSubscription.lifetime_access && (
                <>
                  <button
                    onClick={handleManageBilling}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Manage Billing
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Cancel Subscription
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Free Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-2 border-transparent">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plans.FREE.name}
              </h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Free
              </div>
              <p className="text-gray-600 dark:text-gray-400">Forever</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              {plans.FREE.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button
              disabled={isCurrentPlan('free')}
              className={`w-full py-3 rounded-lg font-semibold ${
                isCurrentPlan('free')
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {isCurrentPlan('free') ? 'Current Plan' : 'Continue with Free'}
            </button>
          </div>

          {/* Premium Monthly */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-2 border-transparent">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plans.PREMIUM_MONTHLY.name}
              </h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                ${formatPrice(plans.PREMIUM_MONTHLY.price)}
              </div>
              <p className="text-gray-600 dark:text-gray-400">per month</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              {plans.PREMIUM_MONTHLY.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSubscribe('premium_monthly')}
              disabled={actionLoading || isCurrentPlan('premium_monthly') || !canUpgrade('premium_monthly')}
              className={`w-full py-3 rounded-lg font-semibold ${
                isCurrentPlan('premium_monthly')
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : canUpgrade('premium_monthly')
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCurrentPlan('premium_monthly') ? 'Current Plan' : 'Choose Monthly'}
            </button>
          </div>

          {/* Premium Yearly */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-2 border-primary-500">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Best Value
              </span>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plans.PREMIUM_YEARLY.name}
              </h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                ${formatPrice(plans.PREMIUM_YEARLY.price)}
              </div>
              <p className="text-gray-600 dark:text-gray-400">per year</p>
              <p className="text-sm text-green-600 font-semibold mt-1">2 months free</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              {plans.PREMIUM_YEARLY.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSubscribe('premium_yearly')}
              disabled={actionLoading || isCurrentPlan('premium_yearly') || !canUpgrade('premium_yearly')}
              className={`w-full py-3 rounded-lg font-semibold ${
                isCurrentPlan('premium_yearly')
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : canUpgrade('premium_yearly')
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCurrentPlan('premium_yearly') ? 'Current Plan' : 'Choose Yearly'}
            </button>
          </div>

          {/* Lifetime */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-2 border-yellow-500">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Early Adopter
              </span>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plans.LIFETIME.name}
              </h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                ${formatPrice(plans.LIFETIME.price)}
              </div>
              <p className="text-gray-600 dark:text-gray-400">one time</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              {plans.LIFETIME.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSubscribe('lifetime')}
              disabled={actionLoading || isCurrentPlan('lifetime') || !canUpgrade('lifetime')}
              className={`w-full py-3 rounded-lg font-semibold ${
                isCurrentPlan('lifetime')
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : canUpgrade('lifetime')
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCurrentPlan('lifetime') ? 'Current Plan' : 'Get Lifetime Access'}
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can cancel your subscription at any time. You'll retain access to premium features until the end of your current billing period.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, we offer a 7-day free trial for new premium subscribers. No credit card required to start.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your data remains secure and accessible. You'll keep all your progress, journal entries, and achievements.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Is the lifetime plan really lifetime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, the lifetime plan gives you permanent access to all premium features for a one-time payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <SimpleNotificationToast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default SubscriptionPage;