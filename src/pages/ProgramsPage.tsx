import React from 'react';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';

export const ProgramsPage: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Recovery Programs
        </h1>
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-xl font-semibold mb-2">Programs Coming Soon</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Recovery programs and courses will be available here.
          </p>
        </Card>
      </div>
    </Layout>
  );
};