import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SimpleNotificationToast from '../components/SimpleNotificationToast';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationState, setVerificationState] = useState<{
    status: 'verifying' | 'success' | 'error';
    message: string;
  }>({ status: 'verifying', message: 'Verifying your email address...' });
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationState({
        status: 'error',
        message: 'No verification token provided'
      });
    }
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      
      if (response.data.success) {
        setVerificationState({
          status: 'success',
          message: 'Email verified successfully! You can now log in.'
        });
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Email verified successfully! You can now log in.' }
          });
        }, 3000);
      } else {
        setVerificationState({
          status: 'error',
          message: response.data.error || 'Email verification failed'
        });
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      setVerificationState({
        status: 'error',
        message: error.response?.data?.error || 'Email verification failed'
      });
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resendEmail.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter your email address'
      });
      return;
    }

    try {
      setIsResending(true);
      
      const response = await api.post('/auth/resend-verification', { 
        email: resendEmail.trim() 
      });
      
      if (response.data.success) {
        setNotification({
          type: 'success',
          message: 'Verification email sent! Please check your inbox.'
        });
        setResendEmail('');
      } else {
        setNotification({
          type: 'error',
          message: response.data.error || 'Failed to send verification email'
        });
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.error || 'Failed to send verification email'
      });
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationState.status) {
      case 'verifying':
        return <LoadingSpinner size="large" />;
      case 'success':
        return (
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (verificationState.status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main verification card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Email Verification
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              RecovR - Your Recovery Journey
            </p>
          </div>

          {getStatusIcon()}

          <h2 className={`text-xl font-semibold mb-4 ${getStatusColor()}`}>
            {verificationState.status === 'verifying' && 'Verifying Email...'}
            {verificationState.status === 'success' && 'Email Verified!'}
            {verificationState.status === 'error' && 'Verification Failed'}
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {verificationState.message}
          </p>

          {verificationState.status === 'success' && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your account is now verified! You'll be redirected to the login page in a few seconds.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-semibold transition-colors"
              >
                Continue to Login
              </button>
            </div>
          )}

          {verificationState.status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  The verification link may have expired or is invalid.
                </p>
              </div>
              
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Resend Verification Email
                </h3>
                
                <form onSubmit={handleResendVerification} className="space-y-3">
                  <div>
                    <label htmlFor="resend-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      id="resend-email"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isResending}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Help section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Need help with verification?
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
            >
              Back to Login
            </button>
            <span className="text-gray-400 mx-2">•</span>
            <button
              onClick={() => navigate('/support')}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
            >
              Contact Support
            </button>
          </div>
        </div>

        {/* Security notice */}
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.863-.833-2.633 0L4.168 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                Security Notice
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Email verification links expire after 24 hours for security. 
                If you didn't request this verification, please ignore this page.
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

export default EmailVerificationPage;