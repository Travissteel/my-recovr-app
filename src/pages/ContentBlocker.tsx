import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

interface ContentCategory {
  id: string;
  name: string;
  description: string;
  category_type: string;
  default_keywords: string[];
  default_websites: string[];
  icon: string;
  color: string;
}

interface BlockedContent {
  id: string;
  content_type: 'website' | 'app' | 'keyword' | 'category';
  content_value: string;
  block_level: 'lenient' | 'moderate' | 'strict';
  is_active: boolean;
  bypass_attempts: number;
  last_triggered_at?: string;
  created_at: string;
  category_name?: string;
  category_color?: string;
}

interface BlockSession {
  id: string;
  session_name: string;
  start_time: string;
  end_time?: string;
  is_active: boolean;
  block_categories: string[];
}

interface BlockStats {
  period: string;
  totalAttempts: number;
  blocksEffective: number;
  topBlocked: Array<{
    content_value: string;
    content_type: string;
    block_count: number;
  }>;
}

const ContentBlocker: React.FC = () => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'blocked-content' | 'sessions' | 'categories'>('dashboard');
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [blockedContent, setBlockedContent] = useState<BlockedContent[]>([]);
  const [sessions, setSessions] = useState<BlockSession[]>([]);
  const [stats, setStats] = useState<BlockStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newContent, setNewContent] = useState({
    contentType: 'website' as 'website' | 'app' | 'keyword' | 'category',
    contentValue: '',
    blockLevel: 'strict' as 'lenient' | 'moderate' | 'strict'
  });

  useEffect(() => {
    fetchCategories();
    fetchBlockedContent();
    fetchSessions();
    fetchStats();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/blocker/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBlockedContent = async () => {
    setLoading(true);
    try {
      const response = await api.get('/blocker/blocked-content', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setBlockedContent(response.data.blockedContent);
    } catch (error) {
      console.error('Error fetching blocked content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/blocker/sessions', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/blocker/stats?period=7d', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const addBlockedContent = async () => {
    try {
      await api.post('/blocker/blocked-content', newContent, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setNewContent({ contentType: 'website', contentValue: '', blockLevel: 'strict' });
      setShowAddContent(false);
      fetchBlockedContent();
    } catch (error) {
      console.error('Error adding blocked content:', error);
    }
  };

  const toggleContentBlock = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/blocker/blocked-content/${id}`, 
        { isActive: !isActive }, 
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      fetchBlockedContent();
    } catch (error) {
      console.error('Error toggling content block:', error);
    }
  };

  const deleteBlockedContent = async (id: string) => {
    try {
      await api.delete(`/blocker/blocked-content/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchBlockedContent();
    } catch (error) {
      console.error('Error deleting blocked content:', error);
    }
  };

  const startBlockingSession = async () => {
    try {
      await api.post('/blocker/sessions', {
        sessionName: 'Focus Session',
        duration: 60, // 1 hour
        blockCategories: ['Social Media', 'Gaming']
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchSessions();
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      await api.post(`/blocker/sessions/${sessionId}/end`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchSessions();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const getBlockLevelColor = (level: string) => {
    switch (level) {
      case 'lenient': return 'bg-yellow-100 text-yellow-800';
      case 'moderate': return 'bg-orange-100 text-orange-800';
      case 'strict': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Content Blocker
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Block websites, apps, and keywords to support your recovery
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: '📊' },
            { key: 'blocked-content', label: 'Blocked Content', icon: '🚫' },
            { key: 'sessions', label: 'Focus Sessions', icon: '⏰' },
            { key: 'categories', label: 'Categories', icon: '📁' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Blocks This Week</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.blocksEffective}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Attempts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">📈</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Effectiveness</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalAttempts > 0 ? Math.round((stats.blocksEffective / stats.totalAttempts) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={() => setShowAddContent(true)} className="h-12">
                🚫 Block New Content
              </Button>
              <Button onClick={startBlockingSession} variant="outline" className="h-12">
                ⏰ Start Focus Session
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          {stats && stats.topBlocked.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Most Blocked Content (7 days)
              </h3>
              <div className="space-y-3">
                {stats.topBlocked.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{item.content_value}</span>
                      <span className="ml-2 text-sm text-gray-500 capitalize">({item.content_type})</span>
                    </div>
                    <span className="text-sm font-medium text-red-600">
                      {item.block_count} blocks
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Blocked Content Tab */}
      {activeTab === 'blocked-content' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Blocked Content
            </h2>
            <Button onClick={() => setShowAddContent(true)}>
              Add New Block
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading blocked content...</div>
          ) : (
            <div className="space-y-3">
              {blockedContent.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${item.is_active ? 'bg-red-500' : 'bg-gray-300'}`} />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.content_value}
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500 capitalize">
                            {item.content_type}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBlockLevelColor(item.block_level)}`}>
                            {item.block_level}
                          </span>
                          {item.bypass_attempts > 0 && (
                            <span className="text-xs text-orange-600">
                              {item.bypass_attempts} attempts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleContentBlock(item.id, item.is_active)}
                      >
                        {item.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteBlockedContent(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Focus Sessions
            </h2>
            <Button onClick={startBlockingSession}>
              Start New Session
            </Button>
          </div>

          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {session.session_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Started: {formatTimeAgo(session.start_time)}
                      {session.end_time && ` • Ended: ${formatTimeAgo(session.end_time)}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.is_active ? 'Active' : 'Ended'}
                    </span>
                    {session.is_active && (
                      <Button size="sm" variant="outline" onClick={() => endSession(session.id)}>
                        End Session
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Content Categories
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {category.description}
                  </p>
                  
                  <div className="text-xs text-gray-500">
                    {category.default_websites.length} websites • {category.default_keywords.length} keywords
                  </div>
                  
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setNewContent({
                        contentType: 'category',
                        contentValue: category.id,
                        blockLevel: 'strict'
                      });
                      setShowAddContent(true);
                    }}
                  >
                    Block Category
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Content Modal */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Block New Content
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type
                </label>
                <select
                  value={newContent.contentType}
                  onChange={(e) => setNewContent({
                    ...newContent,
                    contentType: e.target.value as any
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="website">Website</option>
                  <option value="app">App</option>
                  <option value="keyword">Keyword</option>
                  <option value="category">Category</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newContent.contentType === 'website' ? 'Website URL' :
                   newContent.contentType === 'app' ? 'App Name' :
                   newContent.contentType === 'keyword' ? 'Keyword' : 'Category'}
                </label>
                {newContent.contentType === 'category' ? (
                  <select
                    value={newContent.contentValue}
                    onChange={(e) => setNewContent({
                      ...newContent,
                      contentValue: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newContent.contentValue}
                    onChange={(e) => setNewContent({
                      ...newContent,
                      contentValue: e.target.value
                    })}
                    placeholder={
                      newContent.contentType === 'website' ? 'e.g., facebook.com' :
                      newContent.contentType === 'app' ? 'e.g., Instagram' :
                      'e.g., gambling'
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Block Level
                </label>
                <select
                  value={newContent.blockLevel}
                  onChange={(e) => setNewContent({
                    ...newContent,
                    blockLevel: e.target.value as any
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="lenient">Lenient (can bypass)</option>
                  <option value="moderate">Moderate (delay bypass)</option>
                  <option value="strict">Strict (no bypass)</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <Button onClick={addBlockedContent} className="flex-1">
                Add Block
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddContent(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContentBlocker;