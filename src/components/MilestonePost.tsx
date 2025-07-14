import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface MilestonePostProps {
  groupId?: string;
  onPostCreated?: () => void;
}

const MilestonePost: React.FC<MilestonePostProps> = ({ groupId, onPostCreated }) => {
  const { accessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    milestoneType: 'days_sober' as 'days_sober' | 'weeks_sober' | 'months_sober' | 'years_sober' | 'personal_goal',
    milestoneNumber: 1,
    isAnonymous: false,
    photo: null as File | null
  });
  const [loading, setLoading] = useState(false);

  const milestoneOptions = [
    { value: 'days_sober', label: 'Days Sober', unit: 'day(s)' },
    { value: 'weeks_sober', label: 'Weeks Sober', unit: 'week(s)' },
    { value: 'months_sober', label: 'Months Sober', unit: 'month(s)' },
    { value: 'years_sober', label: 'Years Sober', unit: 'year(s)' },
    { value: 'personal_goal', label: 'Personal Goal', unit: '' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setLoading(true);
    try {
      const milestoneData = {
        title: formData.title || `${formData.milestoneNumber} ${milestoneOptions.find(opt => opt.value === formData.milestoneType)?.unit || ''}`,
        content: formData.content,
        postType: 'milestone',
        isAnonymous: formData.isAnonymous,
        milestoneData: {
          type: formData.milestoneType,
          number: formData.milestoneNumber,
          unit: milestoneOptions.find(opt => opt.value === formData.milestoneType)?.unit
        }
      };

      if (groupId) {
        await api.post(`/community/groups/${groupId}/posts`, milestoneData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } else {
        // Create general milestone post
        await api.post('/community/milestones', milestoneData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }

      // Reset form
      setFormData({
        title: '',
        content: '',
        milestoneType: 'days_sober',
        milestoneNumber: 1,
        isAnonymous: false,
        photo: null
      });
      setIsOpen(false);
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating milestone post:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMilestoneEmoji = (type: string, number: number) => {
    if (type === 'personal_goal') return '🎯';
    if (number === 1) return '🌱';
    if (number <= 7) return '🌿';
    if (number <= 30) return '🌳';
    if (number <= 90) return '🏆';
    if (number <= 365) return '💎';
    return '👑';
  };

  if (!isOpen) {
    return (
      <Card className="p-4">
        <Button 
          onClick={() => setIsOpen(true)}
          className="w-full h-16 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold text-lg"
        >
          🎉 Share a Milestone 🎉
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          🎉 Share Your Milestone
        </h3>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
          ✕
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Milestone Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Milestone Type
            </label>
            <select
              value={formData.milestoneType}
              onChange={(e) => setFormData({ ...formData, milestoneType: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {milestoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number
            </label>
            <input
              type="number"
              min="1"
              value={formData.milestoneNumber}
              onChange={(e) => setFormData({ ...formData, milestoneNumber: parseInt(e.target.value) || 1 })}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Milestone Preview */}
        <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">
              {getMilestoneEmoji(formData.milestoneType, formData.milestoneNumber)}
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formData.milestoneNumber} {milestoneOptions.find(opt => opt.value === formData.milestoneType)?.unit || ''}
              {formData.milestoneType === 'personal_goal' ? ' Personal Goal' : ' Sober!'}
            </span>
          </div>
        </div>

        {/* Custom Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Custom Title (Optional)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Add a custom title for your milestone..."
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Story Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Share Your Story *
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Tell your story... What does this milestone mean to you? What challenges did you overcome? What advice would you give to others?"
            className="w-full p-3 border border-gray-300 rounded-md h-32 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        {/* Anonymous Option */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="anonymous"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="anonymous" className="text-sm text-gray-700 dark:text-gray-300">
            Share anonymously
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <Button 
            type="submit" 
            disabled={loading || !formData.content.trim()}
            className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          >
            {loading ? 'Sharing...' : '🎉 Share Milestone'}
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

export default MilestonePost;