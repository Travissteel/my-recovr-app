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
    if (type === 'personal_goal') return '🎯';\n    if (number === 1) return '🌱';\n    if (number <= 7) return '🌿';\n    if (number <= 30) return '🌳';\n    if (number <= 90) return '🏆';\n    if (number <= 365) return '💎';\n    return '👑';\n  };\n\n  if (!isOpen) {\n    return (\n      <Card className=\"p-4\">\n        <Button \n          onClick={() => setIsOpen(true)}\n          className=\"w-full h-16 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold text-lg\"\n        >\n          🎉 Share a Milestone 🎉\n        </Button>\n      </Card>\n    );\n  }\n\n  return (\n    <Card className=\"p-6\">\n      <div className=\"flex justify-between items-center mb-4\">\n        <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white\">\n          🎉 Share Your Milestone\n        </h3>\n        <Button variant=\"outline\" size=\"sm\" onClick={() => setIsOpen(false)}>\n          ✕\n        </Button>\n      </div>\n\n      <form onSubmit={handleSubmit} className=\"space-y-4\">\n        {/* Milestone Type Selection */}\n        <div className=\"grid grid-cols-2 gap-4\">\n          <div>\n            <label className=\"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1\">\n              Milestone Type\n            </label>\n            <select\n              value={formData.milestoneType}\n              onChange={(e) => setFormData({ ...formData, milestoneType: e.target.value as any })}\n              className=\"w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white\"\n            >\n              {milestoneOptions.map((option) => (\n                <option key={option.value} value={option.value}>\n                  {option.label}\n                </option>\n              ))}\n            </select>\n          </div>\n\n          <div>\n            <label className=\"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1\">\n              Number\n            </label>\n            <input\n              type=\"number\"\n              min=\"1\"\n              value={formData.milestoneNumber}\n              onChange={(e) => setFormData({ ...formData, milestoneNumber: parseInt(e.target.value) || 1 })}\n              className=\"w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white\"\n            />\n          </div>\n        </div>\n\n        {/* Milestone Preview */}\n        <div className=\"p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border\">\n          <div className=\"flex items-center space-x-2\">\n            <span className=\"text-2xl\">\n              {getMilestoneEmoji(formData.milestoneType, formData.milestoneNumber)}\n            </span>\n            <span className=\"font-semibold text-gray-900 dark:text-white\">\n              {formData.milestoneNumber} {milestoneOptions.find(opt => opt.value === formData.milestoneType)?.unit || ''}\n              {formData.milestoneType === 'personal_goal' ? ' Personal Goal' : ' Sober!'}\n            </span>\n          </div>\n        </div>\n\n        {/* Custom Title */}\n        <div>\n          <label className=\"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1\">\n            Custom Title (Optional)\n          </label>\n          <input\n            type=\"text\"\n            value={formData.title}\n            onChange={(e) => setFormData({ ...formData, title: e.target.value })}\n            placeholder=\"Add a custom title for your milestone...\"\n            className=\"w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white\"\n          />\n        </div>\n\n        {/* Story Content */}\n        <div>\n          <label className=\"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1\">\n            Share Your Story *\n          </label>\n          <textarea\n            value={formData.content}\n            onChange={(e) => setFormData({ ...formData, content: e.target.value })}\n            placeholder=\"Tell your story... What does this milestone mean to you? What challenges did you overcome? What advice would you give to others?\"\n            className=\"w-full p-3 border border-gray-300 rounded-md h-32 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white\"\n            required\n          />\n        </div>\n\n        {/* Anonymous Option */}\n        <div className=\"flex items-center space-x-2\">\n          <input\n            type=\"checkbox\"\n            id=\"anonymous\"\n            checked={formData.isAnonymous}\n            onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}\n            className=\"w-4 h-4 text-blue-600\"\n          />\n          <label htmlFor=\"anonymous\" className=\"text-sm text-gray-700 dark:text-gray-300\">\n            Share anonymously\n          </label>\n        </div>\n\n        {/* Action Buttons */}\n        <div className=\"flex space-x-3 pt-2\">\n          <Button \n            type=\"submit\" \n            disabled={loading || !formData.content.trim()}\n            className=\"flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600\"\n          >\n            {loading ? 'Sharing...' : '🎉 Share Milestone'}\n          </Button>\n          <Button \n            type=\"button\" \n            variant=\"outline\" \n            onClick={() => setIsOpen(false)}\n            className=\"px-6\"\n          >\n            Cancel\n          </Button>\n        </div>\n      </form>\n    </Card>\n  );\n};\n\nexport default MilestonePost;"}