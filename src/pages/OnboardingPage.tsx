import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useNotification } from '../contexts/NotificationContext';

const addictionTypes = [
  { id: 'alcohol', name: 'Alcohol', icon: '🍺' },
  { id: 'drugs', name: 'Drugs', icon: '💊' },
  { id: 'nicotine', name: 'Nicotine/Smoking', icon: '🚬' },
  { id: 'pornography', name: 'Pornography', icon: '🔞' },
  { id: 'social_media', name: 'Social Media', icon: '📱' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'gambling', name: 'Gambling', icon: '🎰' },
  { id: 'food', name: 'Food/Eating', icon: '🍔' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'other', name: 'Other', icon: '❓' }
];

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    addictions: [] as string[],
    goals: [] as string[],
    experience: '',
    motivation: ''
  });
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const handleAddictionToggle = (addictionId: string) => {
    setFormData(prev => ({
      ...prev,
      addictions: prev.addictions.includes(addictionId)
        ? prev.addictions.filter(id => id !== addictionId)
        : [...prev.addictions, addictionId]
    }));
  };

  const handleComplete = () => {
    // In real app, save onboarding data to backend
    addNotification({
      type: 'success',
      title: 'Welcome to RecovR!',
      message: 'Your personalized recovery journey is ready to begin.'
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <span className="text-4xl mb-4 block">🌱</span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Let's personalize your recovery journey
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Step {step} of 3: Tell us about yourself to get started
          </p>
        </div>

        <Card className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                What are you looking to overcome?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select all that apply. This helps us provide personalized support.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {addictionTypes.map((addiction) => (
                  <button
                    key={addiction.id}
                    onClick={() => handleAddictionToggle(addiction.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      formData.addictions.includes(addiction.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{addiction.icon}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {addiction.name}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setStep(2)}
                  disabled={formData.addictions.length === 0}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                What's your experience with recovery?
              </h2>
              
              <div className="space-y-4">
                {[
                  { id: 'first_time', label: 'This is my first time seeking recovery' },
                  { id: 'tried_before', label: 'I\'ve tried recovery before' },
                  { id: 'relapsed', label: 'I\'ve had relapses but I\'m committed' },
                  { id: 'long_term', label: 'I\'ve been in recovery for a while' }
                ].map((option) => (
                  <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="experience"
                      value={option.id}
                      checked={formData.experience === option.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  disabled={!formData.experience}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                What motivates you most?
              </h2>
              
              <textarea
                value={formData.motivation}
                onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                placeholder="Share what drives you to recover... (family, health, personal goals, etc.)"
                className="w-full p-3 border border-gray-300 rounded-md h-32 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                maxLength={500}
              />
              
              <p className="text-sm text-gray-500">
                This helps us provide personalized motivation and support.
              </p>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleComplete}>
                  Complete Setup 🎉
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Progress indicator */}
        <div className="mt-6 flex justify-center space-x-2">
          {[1, 2, 3].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`w-3 h-3 rounded-full ${
                stepNumber <= step
                  ? 'bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};