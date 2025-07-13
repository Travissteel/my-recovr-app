import React from 'react';
import { Layout } from '../components/Layout';
import Messaging from './Messaging';

export const MessagingPage: React.FC = () => {
  return (
    <Layout>
      <Messaging />
    </Layout>
  );
};

export default MessagingPage;