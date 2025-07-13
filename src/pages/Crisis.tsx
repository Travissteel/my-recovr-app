import React from 'react';

const Crisis: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Crisis Support
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Get immediate help and support resources
        </p>
      </div>
      
      <div className="crisis-alert">
        <h2 className="text-lg font-semibold text-danger-800 dark:text-danger-200 mb-2">
          Emergency Resources
        </h2>
        <p className="text-danger-700 dark:text-danger-300 mb-4">
          If you're having thoughts of self-harm or substance abuse emergency, please contact:
        </p>
        <div className="space-y-2">
          <p className="font-semibold text-danger-800 dark:text-danger-200">
            National Suicide Prevention Lifeline: 988
          </p>
          <p className="font-semibold text-danger-800 dark:text-danger-200">
            Crisis Text Line: Text HOME to 741741
          </p>
          <p className="font-semibold text-danger-800 dark:text-danger-200">
            SAMHSA National Helpline: 1-800-662-4357
          </p>
        </div>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Crisis Intervention Features
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Advanced crisis intervention and support features are being developed.
        </p>
      </div>
    </div>
  );
};

export default Crisis;