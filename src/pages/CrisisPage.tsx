import React from 'react';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export const CrisisPage: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-red-600 mb-8 text-center">
          🆘 Crisis Support
        </h1>
        
        <Card className="p-8 mb-6 bg-red-50 border-red-200">
          <h2 className="text-xl font-semibold text-red-800 mb-4">
            Immediate Help Resources
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-red-700">National Suicide Prevention Lifeline</h3>
              <p className="text-red-600">Call: 988 (24/7 Crisis Support)</p>
            </div>
            <div>
              <h3 className="font-medium text-red-700">Crisis Text Line</h3>
              <p className="text-red-600">Text HOME to 741741</p>
            </div>
            <div>
              <h3 className="font-medium text-red-700">SAMHSA National Helpline</h3>
              <p className="text-red-600">1-800-662-4357 (Treatment Referral)</p>
            </div>
          </div>
        </Card>
        
        <div className="text-center">
          <Button size="lg" className="bg-red-600 hover:bg-red-700">
            Get Immediate Help
          </Button>
        </div>
      </div>
    </Layout>
  );
};