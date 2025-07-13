import React from 'react';

const Programs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recovery Programs
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your recovery programs and track your progress
        </p>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Coming Soon
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Recovery programs functionality is being developed.
        </p>
      </div>
    </div>
  );
};

export default Programs;