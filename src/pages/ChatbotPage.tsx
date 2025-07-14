import React, { useState } from 'react';
import ChatbotWidget from '../components/ai/ChatbotWidget';

const ChatbotPage: React.FC = () => {
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Recovery Companion
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Your personal AI companion for recovery support, available 24/7 to provide guidance, 
            motivation, and evidence-based coping strategies.
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">🚀 Launching Soon</h2>
              <p className="text-primary-100 mb-4">
                We're putting the finishing touches on your AI recovery companion. 
                Expected launch: 3-6 months after platform release.
              </p>
              <div className="text-sm text-primary-200">
                <p>✨ Be among the first to experience AI-powered recovery support</p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl">
                🤖
              </div>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
              💬
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              24/7 Support Chat
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Always available to provide emotional support, answer questions, and guide you through challenging moments.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900 rounded-lg flex items-center justify-center mb-4">
              🧠
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Personalized Insights
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              AI analyzes your progress patterns and provides tailored recommendations for your recovery journey.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900 rounded-lg flex items-center justify-center mb-4">
              🛡️
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Crisis Prevention
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Proactive support that recognizes warning signs and provides immediate intervention strategies.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
            <div className="w-12 h-12 bg-danger-100 dark:bg-danger-900 rounded-lg flex items-center justify-center mb-4">
              📚
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Evidence-Based Guidance
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Trained on proven recovery methodologies including CBT, DBT, and motivational interviewing techniques.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
            <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900 rounded-lg flex items-center justify-center mb-4">
              🎯
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Goal Tracking
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Intelligent goal setting and progress monitoring with adaptive milestones based on your journey.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
              🔒
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Privacy First
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              End-to-end encryption ensures your conversations remain completely private and confidential.
            </p>
          </div>
        </div>

        {/* Comparison with Competitors */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-soft mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            More Advanced Than Quittr's AI
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Feature</th>
                  <th className="text-center py-3 px-4 text-primary-600">RecovR AI</th>
                  <th className="text-center py-3 px-4 text-gray-500">Quittr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Multi-addiction support</td>
                  <td className="text-center py-3 px-4 text-green-600">✅</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">24/7 AI chat support</td>
                  <td className="text-center py-3 px-4 text-green-600">✅</td>
                  <td className="text-center py-3 px-4 text-orange-500">Limited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Crisis intervention AI</td>
                  <td className="text-center py-3 px-4 text-green-600">✅</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Personalized therapy insights</td>
                  <td className="text-center py-3 px-4 text-green-600">✅</td>
                  <td className="text-center py-3 px-4 text-orange-500">Basic</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Community integration</td>
                  <td className="text-center py-3 px-4 text-green-600">✅</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Monthly cost</td>
                  <td className="text-center py-3 px-4 text-green-600">$6.99</td>
                  <td className="text-center py-3 px-4 text-gray-500">$9.99-14.99</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview Widget */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Preview the Experience
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Try the chat interface (demo mode) to see what's coming
          </p>
        </div>
      </div>

      {/* Chatbot Widget */}
      <ChatbotWidget
        isOpen={isWidgetOpen}
        onToggle={() => setIsWidgetOpen(!isWidgetOpen)}
        position="center"
      />
    </div>
  );
};

export default ChatbotPage;