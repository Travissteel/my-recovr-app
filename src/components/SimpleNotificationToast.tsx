import React, { useEffect } from 'react';

interface SimpleNotificationToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const SimpleNotificationToast: React.FC<SimpleNotificationToastProps> = ({
  type,
  message,
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`
        p-4 rounded-lg border shadow-lg transition-all duration-300 transform
        ${getStyles()}
        animate-in slide-in-from-right
      `}>
        <div className="flex items-start space-x-3">
          <span className="text-lg flex-shrink-0">
            {getIcon()}
          </span>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              {message}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleNotificationToast;