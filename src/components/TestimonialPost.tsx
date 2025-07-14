import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface TestimonialPostProps {
  groupId?: string;
  onPostCreated?: () => void;
}

const TestimonialPost: React.FC<TestimonialPostProps> = ({ groupId, onPostCreated }) => {
  const { accessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    storyType: 'recovery_journey' as 'recovery_journey' | 'breakthrough_moment' | 'daily_struggle' | 'advice_wisdom' | 'gratitude',
    isAnonymous: false,
    tags: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState('');

  const storyTypes = [
    { value: 'recovery_journey', label: 'Recovery Journey', icon: '🛤️', description: 'Share your overall recovery story' },
    { value: 'breakthrough_moment', label: 'Breakthrough Moment', icon: '💡', description: 'A moment that changed everything' },
    { value: 'daily_struggle', label: 'Daily Struggles', icon: '⚡', description: 'Honest about the challenges' },
    { value: 'advice_wisdom', label: 'Advice & Wisdom', icon: '🦉', description: 'Share what you\'ve learned' },
    { value: 'gratitude', label: 'Gratitude', icon: '🙏', description: 'What you\'re grateful for today' }
  ];

  const popularTags = [
    'first-time-sharing', 'one-day-at-a-time', 'support-system', 'therapy-helped',
    'family-support', 'self-care', 'meditation', 'exercise', 'new-habits',
    'trigger-management', 'relapse-recovery', 'hope', 'strength', 'community'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setLoading(true);
    try {
      const testimonialData = {
        title: formData.title,
        content: formData.content,
        postType: 'inspiration',
        isAnonymous: formData.isAnonymous,
        storyData: {
          type: formData.storyType,
          tags: formData.tags
        }
      };

      if (groupId) {
        await api.post(`/community/groups/${groupId}/posts`, testimonialData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } else {
        // Create general testimonial post
        await api.post('/community/testimonials', testimonialData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }

      // Reset form
      setFormData({
        title: '',
        content: '',
        storyType: 'recovery_journey',
        isAnonymous: false,
        tags: []
      });
      setIsOpen(false);
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating testimonial post:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      });
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  if (!isOpen) {
    return (
      <Card className="p-4">
        <Button 
          onClick={() => setIsOpen(true)}
          className="w-full h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-lg"
        >
          💝 Share Your Story 💝
        </Button>
      </Card>
    );
  }

  const selectedStoryType = storyTypes.find(type => type.value === formData.storyType);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          💝 Share Your Story
        </h3>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
          ✕
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Story Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What type of story would you like to share?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {storyTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, storyType: type.value as any })}
                className={`p-3 text-left border rounded-lg transition-all ${
                  formData.storyType === type.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{type.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {type.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Story Type Preview */}
        {selectedStoryType && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{selectedStoryType.icon}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedStoryType.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedStoryType.description}
            </p>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title (Optional)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Give your story a meaningful title..."
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Story Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Your Story *
          </label>
          <div className="mb-2">
            <details className="text-sm text-gray-600 dark:text-gray-400">
              <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                💡 Writing prompts (click to expand)
              </summary>
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ul className="space-y-1 text-xs">
                  <li>• What was your lowest point, and how did you find the strength to change?</li>
                  <li>• What does a typical day in recovery look like for you?</li>
                  <li>• What advice would you give to someone just starting their journey?</li>
                  <li>• How has your relationship with yourself and others changed?</li>
                  <li>• What are you most grateful for in your recovery?</li>
                </ul>
              </div>
            </details>
          </div>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Share your story... Your words might be exactly what someone else needs to hear today."
            className="w-full p-3 border border-gray-300 rounded-md h-40 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags (Help others find your story)
          </label>
          
          {/* Selected Tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center space-x-1"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add Custom Tag */}
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a custom tag..."
              className="flex-1 p-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(newTag);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => addTag(newTag)}
              disabled={!newTag.trim()}
            >
              Add
            </Button>
          </div>

          {/* Popular Tags */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Popular tags:</p>
            <div className="flex flex-wrap gap-1">
              {popularTags.filter(tag => !formData.tags.includes(tag)).slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Anonymous Option */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="anonymous-story"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
            className="w-4 h-4 text-purple-600"
          />
          <label htmlFor="anonymous-story" className="text-sm text-gray-700 dark:text-gray-300">
            Share anonymously
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <Button 
            type="submit" 
            disabled={loading || !formData.content.trim()}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {loading ? 'Sharing...' : '💝 Share Story'}
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

export default TestimonialPost;