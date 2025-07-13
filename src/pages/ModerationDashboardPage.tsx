import React from 'react';
import { Layout } from '../components/Layout';
import ModerationDashboard from './ModerationDashboard';

export const ModerationDashboardPage: React.FC = () => {
  return (
    <Layout>
      <ModerationDashboard />
    </Layout>
  );
};

export default ModerationDashboardPage;