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
      <Card className=\"p-4\">\n        <Button \n          onClick={() => setIsOpen(true)}\n          className=\"w-full h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-lg\"\n        >\n          💝 Share Your Story 💝\n        </Button>\n      </Card>\n    );\n  }\n\n  const selectedStoryType = storyTypes.find(type => type.value === formData.storyType);\n\n  return (\n    <Card className=\"p-6\">\n      <div className=\"flex justify-between items-center mb-4\">\n        <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white\">\n          💝 Share Your Story\n        </h3>\n        <Button variant=\"outline\" size=\"sm\" onClick={() => setIsOpen(false)}>\n          ✕\n        </Button>\n      </div>\n\n      <form onSubmit={handleSubmit} className=\"space-y-4\">\n        {/* Story Type Selection */}\n        <div>\n          <label className=\"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2\">\n            What type of story would you like to share?\n          </label>\n          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-2\">\n            {storyTypes.map((type) => (\n              <button\n                key={type.value}\n                type=\"button\"\n                onClick={() => setFormData({ ...formData, storyType: type.value as any })}\n                className={`p-3 text-left border rounded-lg transition-all ${\n                  formData.storyType === type.value\n                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'\n                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'\n                }`}\n              >\n                <div className=\"flex items-center space-x-2 mb-1\">\n                  <span className=\"text-lg\">{type.icon}</span>\n                  <span className=\"font-medium text-gray-900 dark:text-white\">\n                    {type.label}\n                  </span>\n                </div>\n                <p className=\"text-xs text-gray-600 dark:text-gray-400\">\n                  {type.description}\n                </p>\n              </button>\n            ))}\n          </div>\n        </div>\n\n        {/* Story Type Preview */}\n        {selectedStoryType && (\n          <div className=\"p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border\">\n            <div className=\"flex items-center space-x-2\">\n              <span className=\"text-xl\">{selectedStoryType.icon}</span>\n              <span className=\"font-semibold text-gray-900 dark:text-white\">\n                {selectedStoryType.label}\n              </span>\n            </div>\n            <p className=\"text-sm text-gray-600 dark:text-gray-400 mt-1\">\n              {selectedStoryType.description}\n            </p>\n          </div>\n        )}\n\n        {/* Title */}\n        <div>\n          <label className=\"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1\">\n            Title (Optional)\n          </label>\n          <input\n            type=\"text\"\n            value={formData.title}\n            onChange={(e) => setFormData({ ...formData, title: e.target.value })}\n            placeholder=\"Give your story a meaningful title...\"\n            className=\"w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white\"\n          />\n        </div>\n\n        {/* Story Content */}\n        <div>\n          <label className=\"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1\">\n            Your Story *\n          </label>\n          <div className=\"mb-2\">\n            <details className=\"text-sm text-gray-600 dark:text-gray-400\">\n              <summary className=\"cursor-pointer hover:text-gray-800 dark:hover:text-gray-200\">\n                💡 Writing prompts (click to expand)\n              </summary>\n              <div className=\"mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg\">\n                <ul className=\"space-y-1 text-xs\">\n                  <li>• What was your lowest point, and how did you find the strength to change?</li>\n                  <li>• What does a typical day in recovery look like for you?</li>\n                  <li>• What advice would you give to someone just starting their journey?</li>\n                  <li>• How has your relationship with yourself and others changed?</li>\n                  <li>• What are you most grateful for in your recovery?</li>\n                </ul>\n              </div>\n            </details>\n          </div>\n          <textarea\n            value={formData.content}\n            onChange={(e) => setFormData({ ...formData, content: e.target.value })}\n            placeholder=\"Share your story... Your words might be exactly what someone else needs to hear today.\"\n            className=\"w-full p-3 border border-gray-300 rounded-md h-40 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white\"\n            required\n          />\n        </div>\n\n        {/* Tags */}\n        <div>\n          <label className=\"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2\">\n            Tags (Help others find your story)\n          </label>\n          \n          {/* Selected Tags */}\n          {formData.tags.length > 0 && (\n            <div className=\"flex flex-wrap gap-2 mb-2\">\n              {formData.tags.map((tag) => (\n                <span\n                  key={tag}\n                  className=\"px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center space-x-1\"\n                >\n                  <span>{tag}</span>\n                  <button\n                    type=\"button\"\n                    onClick={() => removeTag(tag)}\n                    className=\"text-purple-600 hover:text-purple-800\"\n                  >\n                    ×\n                  </button>\n                </span>\n              ))}\n            </div>\n          )}\n\n          {/* Add Custom Tag */}\n          <div className=\"flex space-x-2 mb-2\">\n            <input\n              type=\"text\"\n              value={newTag}\n              onChange={(e) => setNewTag(e.target.value)}\n              placeholder=\"Add a custom tag...\"\n              className=\"flex-1 p-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white\"\n              onKeyPress={(e) => {\n                if (e.key === 'Enter') {\n                  e.preventDefault();\n                  addTag(newTag);\n                }\n              }}\n            />\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              onClick={() => addTag(newTag)}\n              disabled={!newTag.trim()}\n            >\n              Add\n            </Button>\n          </div>\n\n          {/* Popular Tags */}\n          <div>\n            <p className=\"text-xs text-gray-500 mb-2\">Popular tags:</p>\n            <div className=\"flex flex-wrap gap-1\">\n              {popularTags.filter(tag => !formData.tags.includes(tag)).slice(0, 8).map((tag) => (\n                <button\n                  key={tag}\n                  type=\"button\"\n                  onClick={() => addTag(tag)}\n                  className=\"px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs transition-colors\"\n                >\n                  {tag}\n                </button>\n              ))}\n            </div>\n          </div>\n        </div>\n\n        {/* Anonymous Option */}\n        <div className=\"flex items-center space-x-2\">\n          <input\n            type=\"checkbox\"\n            id=\"anonymous-story\"\n            checked={formData.isAnonymous}\n            onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}\n            className=\"w-4 h-4 text-purple-600\"\n          />\n          <label htmlFor=\"anonymous-story\" className=\"text-sm text-gray-700 dark:text-gray-300\">\n            Share anonymously\n          </label>\n        </div>\n\n        {/* Action Buttons */}\n        <div className=\"flex space-x-3 pt-2\">\n          <Button \n            type=\"submit\" \n            disabled={loading || !formData.content.trim()}\n            className=\"flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600\"\n          >\n            {loading ? 'Sharing...' : '💝 Share Story'}\n          </Button>\n          <Button \n            type=\"button\" \n            variant=\"outline\" \n            onClick={() => setIsOpen(false)}\n            className=\"px-6\"\n          >\n            Cancel\n          </Button>\n        </div>\n      </form>\n    </Card>\n  );\n};\n\nexport default TestimonialPost;"}