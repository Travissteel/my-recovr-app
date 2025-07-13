import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface CrisisSupportPostProps {
  onPostCreated?: () => void;
}

interface EmergencyContacts {
  emergency: string;
  suicide: string;
  crisis_text: string;
  samhsa: string;
  addiction: string;
}

const CrisisSupportPost: React.FC<CrisisSupportPostProps> = ({ onPostCreated }) => {
  const { accessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showEmergencyInfo, setShowEmergencyInfo] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    crisisLevel: 1,
    supportType: 'peer_support' as 'immediate_help' | 'peer_support' | 'resource_request' | 'check_in',
    isAnonymous: false
  });
  const [loading, setLoading] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContacts | null>(null);

  const crisisLevels = [
    { 
      value: 1, 
      label: '💙 Support Needed', 
      description: 'Looking for encouragement and peer support',
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    { 
      value: 2, 
      label: '💛 Having a Difficult Day', 
      description: 'Struggling but managing, could use some help',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    },
    { 
      value: 3, 
      label: '🧡 Significant Stress', 
      description: 'Feeling overwhelmed, professional support recommended',
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    },
    { 
      value: 4, 
      label: '❤️ High Risk Situation', 
      description: 'In serious difficulty, professional help strongly advised',
      color: 'bg-red-50 border-red-200 text-red-800'
    },
    { 
      value: 5, 
      label: '🚨 Immediate Danger', 
      description: 'EMERGENCY: Please contact crisis services immediately',
      color: 'bg-red-100 border-red-400 text-red-900 font-bold'
    }
  ];

  const supportTypes = [
    { value: 'immediate_help', label: '🆘 Immediate Help', description: 'Need urgent support right now' },
    { value: 'peer_support', label: '🤝 Peer Support', description: 'Connect with others who understand' },
    { value: 'resource_request', label: '📚 Need Resources', description: 'Looking for helpful resources or information' },
    { value: 'check_in', label: '☕ Check-in', description: 'Sharing how I\'m doing today' }
  ];

  React.useEffect(() => {
    // Fetch emergency contacts when component mounts
    fetchEmergencyContacts();
  }, []);

  React.useEffect(() => {
    // Show emergency info for high crisis levels
    if (formData.crisisLevel >= 4) {
      setShowEmergencyInfo(true);
    } else {
      setShowEmergencyInfo(false);
    }
  }, [formData.crisisLevel]);

  const fetchEmergencyContacts = async () => {
    try {
      const response = await api.get('/crisis-support/resources?emergencyOnly=true');
      setEmergencyContacts(response.data.emergencyContacts);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/crisis-support/support-posts', formData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Reset form
      setFormData({
        title: '',
        content: '',
        crisisLevel: 1,
        supportType: 'peer_support',
        isAnonymous: false
      });
      setIsOpen(false);
      
      // Show emergency info if provided
      if (response.data.emergencyInfo) {
        alert('IMPORTANT: Please consider contacting emergency services or a crisis hotline immediately. Your safety is our priority.');
      }
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating crisis support post:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCrisisLevel = crisisLevels.find(level => level.value === formData.crisisLevel);
  const selectedSupportType = supportTypes.find(type => type.value === formData.supportType);

  if (!isOpen) {
    return (
      <Card className="p-4 border-2 border-red-200">
        <div className="text-center">
          <div className="mb-3">
            <span className="text-3xl">🆘</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Need Support?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Reach out to our community for help, resources, or just to check in
          </p>
          <Button 
            onClick={() => setIsOpen(true)}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
          >
            Request Support
          </Button>
          
          {emergencyContacts && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-red-700 font-medium">
                🚨 Emergency? Call {emergencyContacts.emergency} or text {emergencyContacts.crisis_text}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-red-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          🆘 Request Support
        </h3>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
          ✕
        </Button>
      </div>

      {/* Emergency Warning Banner */}
      {showEmergencyInfo && emergencyContacts && (
        <div className="mb-4 p-4 bg-red-100 border-2 border-red-300 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-xl mr-2">🚨</span>
            <h4 className="font-bold text-red-900">IMMEDIATE HELP AVAILABLE</h4>
          </div>
          <p className="text-sm text-red-800 mb-3">
            If you are in immediate danger or having thoughts of self-harm, please contact:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="bg-white p-2 rounded border">
              <strong>Emergency:</strong> {emergencyContacts.emergency}
            </div>
            <div className="bg-white p-2 rounded border">
              <strong>Crisis Line:</strong> {emergencyContacts.suicide}
            </div>
            <div className="bg-white p-2 rounded border">
              <strong>Crisis Text:</strong> {emergencyContacts.crisis_text}
            </div>
            <div className="bg-white p-2 rounded border">
              <strong>Addiction Help:</strong> {emergencyContacts.addiction}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Crisis Level Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How urgent is your situation? *
          </label>
          <div className="space-y-2">
            {crisisLevels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setFormData({ ...formData, crisisLevel: level.value })}
                className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                  formData.crisisLevel === level.value
                    ? level.color
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="font-medium">{level.label}</div>
                <div className="text-sm opacity-75">{level.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Support Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What kind of support do you need? *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {supportTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, supportType: type.value as any })}
                className={`p-3 text-left border rounded-lg transition-all ${
                  formData.supportType === type.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {type.label}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {type.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selection Preview */}
        {selectedCrisisLevel && selectedSupportType && (
          <div className={`p-3 rounded-lg border-2 ${selectedCrisisLevel.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{selectedCrisisLevel.label}</span>
                <span className="mx-2">•</span>
                <span className="font-medium">{selectedSupportType.label}</span>
              </div>
              {formData.crisisLevel >= 4 && (
                <span className="text-sm font-bold">⚠️ HIGH PRIORITY</span>
              )}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject (Optional)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Brief description of your situation..."
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tell us what's happening *
          </label>
          <div className="mb-2">
            <details className="text-sm text-gray-600 dark:text-gray-400">
              <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                💡 What to include (click to expand)
              </summary>
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ul className="space-y-1 text-xs">
                  <li>• What's triggering these feelings right now?</li>
                  <li>• What kind of support would help most?</li>
                  <li>• Are you in a safe place?</li>
                  <li>• Have you tried any coping strategies?</li>
                  <li>• Is there anything specific you need advice on?</li>
                </ul>
              </div>
            </details>
          </div>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Share what's happening and how our community can support you..."
            className="w-full p-3 border border-gray-300 rounded-md h-32 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        {/* Anonymous Option */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="anonymous-crisis"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
            className="w-4 h-4 text-red-600"
          />
          <label htmlFor="anonymous-crisis" className="text-sm text-gray-700 dark:text-gray-300">
            Post anonymously (recommended for sensitive situations)
          </label>
        </div>

        {/* Legal Disclaimer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Important:</strong> This platform provides peer support only and is not a substitute for professional medical advice. 
            In case of emergency, contact emergency services immediately. Crisis-level posts are automatically flagged for professional review.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <Button 
            type="submit" 
            disabled={loading || !formData.content.trim()}
            className={`flex-1 ${
              formData.crisisLevel >= 4 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Posting...' : formData.crisisLevel >= 4 ? '🚨 Request Urgent Help' : '🆘 Request Support'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="px-6"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CrisisSupportPost;