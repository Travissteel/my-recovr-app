import React from 'react';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';

export const ProfilePage: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Profile Settings
        </h1>
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-xl font-semibold mb-2">Profile Management</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Profile settings and customization options coming soon.
          </p>
        </Card>
      </div>
    </Layout>
  );
};