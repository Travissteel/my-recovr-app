import React from 'react';
import Layout from '../components/Layout';
import ContentBlocker from './ContentBlocker';

export const ContentBlockerPage: React.FC = () => {
  return (
    <Layout>
      <ContentBlocker />
    </Layout>
  );
};

export default ContentBlockerPage;