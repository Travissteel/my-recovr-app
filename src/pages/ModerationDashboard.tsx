import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

interface DashboardStats {
  queueStats: {
    total_pending: number;
    high_priority: number;
    pending_messages: number;
    pending_posts: number;
    pending_reports: number;
  };
  violationTrends: Array<{
    violation_type: string;
    severity_level: number;
    count: number;
    block_rate: number;
  }>;
  actionsSummary: Array<{
    action_type: string;
    count: number;
    automated_count: number;
  }>;
  highPriorityCrisis: number;
}

interface QueueItem {
  id: string;
  item_type: string;
  item_id: string;
  priority: number;
  status: string;
  violation_types: string[];
  safety_score?: number;
  auto_flagged: boolean;
  created_at: string;
  item_details: any;
  assigned_to_name?: string;
}

interface PlatformHealth {
  total_active_users: number;
  daily_active_users: number;
  messages_24h: number;
  blocked_messages_24h: number;
  active_crisis_posts: number;
  pending_reviews: number;
  restricted_users: number;
  blocked_message_rate: number;
  health_score: number;
}

interface FlaggedContent {
  id: string;
  content_type: 'message' | 'post' | 'comment';
  content_id: string;
  content_preview: string;
  flagged_terms: string[];
  safety_score: number;
  violation_types: string[];
  severity_level: number;
  auto_flagged: boolean;
  created_at: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  user_info: {
    id: string;
    username: string;
    display_name: string;
  };
  full_content?: string;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: string;
  created_at: string;
  last_active: string;
  total_messages: number;
  blocked_messages: number;
  warnings_count: number;
  restrictions: Array<{
    type: string;
    reason: string;
    expires_at: string | null;
    is_permanent: boolean;
  }>;
  safety_score_avg: number;
  violation_history: Array<{
    violation_type: string;
    date: string;
    action_taken: string;
  }>;
}

interface ModerationSettings {
  safety_thresholds: {
    auto_flag_threshold: number;
    auto_block_threshold: number;
    crisis_escalation_threshold: number;
  };
  flagged_terms: Array<{
    id: string;
    term: string;
    category: string;
    severity: number;
    is_regex: boolean;
    is_active: boolean;
  }>;
  automation_rules: Array<{
    id: string;
    rule_name: string;
    condition: string;
    action: string;
    is_active: boolean;
  }>;
}

const ModerationDashboard: React.FC = () => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'flagged' | 'users' | 'settings'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(null);
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<ModerationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(null);
  const [selectedFlaggedContent, setSelectedFlaggedContent] = useState<FlaggedContent | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDashboardStats();
    fetchPlatformHealth();
  }, []);

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchQueueItems();
    } else if (activeTab === 'flagged') {
      fetchFlaggedContent();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/moderation/dashboard-stats', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchQueueItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/moderation/queue', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setQueueItems(response.data.queueItems);
    } catch (error) {
      console.error('Error fetching queue items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformHealth = async () => {
    try {
      const response = await api.get('/moderation/platform-health', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setPlatformHealth(response.data.metrics);
    } catch (error) {
      console.error('Error fetching platform health:', error);
    }
  };

  const fetchFlaggedContent = async () => {
    setLoading(true);
    try {
      const response = await api.get('/moderation/flagged-content', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { status: filterStatus !== 'all' ? filterStatus : undefined }
      });
      setFlaggedContent(response.data.flaggedContent);
    } catch (error) {
      console.error('Error fetching flagged content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/moderation/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { search: searchTerm || undefined }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/moderation/settings', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignQueueItem = async (itemId: string) => {
    try {
      await api.post(`/moderation/queue/${itemId}/assign`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchQueueItems();
    } catch (error) {
      console.error('Error assigning queue item:', error);
    }
  };

  const takeModerationAction = async () => {
    if (!selectedQueueItem || !actionType || !actionReason) return;

    try {
      await api.post('/moderation/actions', {
        targetType: selectedQueueItem.item_type,
        targetId: selectedQueueItem.item_id,
        actionType,
        reason: actionReason,
        durationHours: actionDuration ? parseInt(actionDuration) : null,
        queueItemId: selectedQueueItem.id
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      setSelectedQueueItem(null);
      setActionType('');
      setActionReason('');
      setActionDuration('');
      fetchQueueItems();
      fetchDashboardStats();
    } catch (error) {
      console.error('Error taking moderation action:', error);
    }
  };

  const reviewFlaggedContent = async (contentId: string, action: 'approve' | 'dismiss' | 'escalate') => {
    try {
      await api.post(`/moderation/flagged-content/${contentId}/review`, {
        action,
        reason: actionReason
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      setSelectedFlaggedContent(null);
      setActionReason('');
      fetchFlaggedContent();
    } catch (error) {
      console.error('Error reviewing flagged content:', error);
    }
  };

  const updateUserRestriction = async (userId: string, action: string) => {
    try {
      await api.post(`/moderation/users/${userId}/restriction`, {
        action,
        reason: actionReason,
        durationHours: actionDuration ? parseInt(actionDuration) : null
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      setSelectedUser(null);
      setActionReason('');
      setActionDuration('');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user restriction:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<ModerationSettings>) => {
    try {
      await api.put('/moderation/settings', newSettings, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      fetchSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-100';
    if (priority >= 3) return 'text-orange-600 bg-orange-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          🛡️ Moderation Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor community safety and handle moderation tasks
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'queue', label: 'Moderation Queue', icon: '📋' },
            { key: 'flagged', label: 'Flagged Content', icon: '🚩' },
            { key: 'users', label: 'User Management', icon: '👥' },
            { key: 'settings', label: 'Settings', icon: '⚙️' }
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Platform Health */}
          {platformHealth && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Platform Health
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getHealthScoreColor(platformHealth.health_score)}`}>
                    {platformHealth.health_score}%
                  </div>
                  <div className="text-sm text-gray-600">Health Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {platformHealth.daily_active_users}
                  </div>
                  <div className="text-sm text-gray-600">Daily Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {platformHealth.messages_24h}
                  </div>
                  <div className="text-sm text-gray-600">Messages (24h)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {platformHealth.blocked_messages_24h}
                  </div>
                  <div className="text-sm text-gray-600">Blocked Messages</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Block Rate:</span>
                  <span className="font-medium">{platformHealth.blocked_message_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Reviews:</span>
                  <span className="font-medium">{platformHealth.pending_reviews}</span>
                </div>
                <div className="flex justify-between">
                  <span>Restricted Users:</span>
                  <span className="font-medium">{platformHealth.restricted_users}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Queue Summary */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Pending Reviews
                </h4>
                <div className="text-3xl font-bold text-orange-600">
                  {stats.queueStats.total_pending}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {stats.queueStats.high_priority} high priority
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Crisis Posts
                </h4>
                <div className="text-3xl font-bold text-red-600">
                  {stats.highPriorityCrisis}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Requiring immediate attention
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Safety Violations
                </h4>
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.violationTrends.reduce((sum, v) => sum + v.count, 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Last 7 days
                </div>
              </Card>
            </div>
          )}

          {/* Violation Trends */}
          {stats && stats.violationTrends.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Safety Violations (7 days)
              </h3>
              <div className="space-y-3">
                {stats.violationTrends.slice(0, 5).map((violation, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium capitalize">
                        {violation.violation_type.replace('_', ' ')}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        (Severity {violation.severity_level})
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{violation.count}</div>
                      <div className="text-xs text-gray-500">
                        {Math.round(violation.block_rate * 100)}% blocked
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Moderation Queue Tab */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Moderation Queue
            </h2>
            <Button onClick={fetchQueueItems}>
              Refresh Queue
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading queue items...</div>
          ) : queueItems.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Queue is Empty
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No items requiring moderation at this time.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {queueItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          Priority {item.priority}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium capitalize">
                          {item.item_type}
                        </span>
                        {item.auto_flagged && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            Auto-flagged
                          </span>
                        )}
                      </div>

                      {item.item_details && (
                        <div className="mb-3">
                          {item.item_type === 'message' && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">
                                From: {item.item_details.sender_name}
                              </p>
                              <p className="text-sm bg-gray-50 p-2 rounded border-l-2 border-red-300">
                                "{item.item_details.content}"
                              </p>
                              {item.safety_score && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Safety Score: {item.safety_score}/100
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created: {formatTimeAgo(item.created_at)}</span>
                        {item.assigned_to_name && (
                          <span>Assigned to: {item.assigned_to_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => assignQueueItem(item.id)}
                        >
                          Assign to Me
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedQueueItem(item)}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      {selectedQueueItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Take Moderation Action
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select an action</option>
                  <option value="approve_content">Approve Content</option>
                  <option value="warn">Issue Warning</option>
                  <option value="delete_content">Delete Content</option>
                  <option value="mute">Temporarily Mute User</option>
                  <option value="ban">Ban User</option>
                  <option value="escalate_to_admin">Escalate to Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explain the reason for this action..."
                  className="w-full p-2 border border-gray-300 rounded-md h-20 resize-none"
                  required
                />
              </div>

              {(actionType === 'mute' || actionType === 'ban') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={actionDuration}
                    onChange={(e) => setActionDuration(e.target.value)}
                    placeholder="Leave empty for permanent"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                onClick={takeModerationAction}
                disabled={!actionType || !actionReason}
                className="flex-1"
              >
                Take Action
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedQueueItem(null);
                  setActionType('');
                  setActionReason('');
                  setActionDuration('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Flagged Content Tab */}
      {activeTab === 'flagged' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Flagged Content Review
            </h2>
            <div className="flex space-x-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <Button onClick={fetchFlaggedContent}>Refresh</Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading flagged content...</div>
          ) : flaggedContent.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Flagged Content
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No content matches the current filter criteria.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {flaggedContent.map((content) => (
                <Card key={content.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          content.severity_level >= 4 ? 'text-red-600 bg-red-100' :
                          content.severity_level >= 3 ? 'text-orange-600 bg-orange-100' :
                          'text-yellow-600 bg-yellow-100'
                        }`}>
                          Severity {content.severity_level}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium capitalize">
                          {content.content_type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          content.status === 'pending' ? 'text-orange-600 bg-orange-100' :
                          content.status === 'reviewed' ? 'text-green-600 bg-green-100' :
                          'text-gray-600 bg-gray-100'
                        }`}>
                          {content.status}
                        </span>
                        {content.auto_flagged && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            Auto-flagged
                          </span>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">
                          From: {content.user_info.display_name} (@{content.user_info.username})
                        </p>
                        <p className="text-sm bg-gray-50 p-2 rounded border-l-2 border-red-300">
                          "{content.content_preview}"
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {content.flagged_terms.map((term, index) => (
                            <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                              {term}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Safety Score: {content.safety_score}/100
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Flagged: {formatTimeAgo(content.created_at)}</span>
                        <span>Violations: {content.violation_types.join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {content.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedFlaggedContent(content)}
                          >
                            Review
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              User Management
            </h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <Button onClick={fetchUsers}>Search</Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Users Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No users match the search criteria.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {user.display_name}
                        </h4>
                        <span className="text-gray-500 text-sm">@{user.username}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'text-purple-600 bg-purple-100' :
                          user.role === 'moderator' ? 'text-blue-600 bg-blue-100' :
                          'text-gray-600 bg-gray-100'
                        }`}>
                          {user.role}
                        </span>
                        {user.restrictions.length > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                            Restricted
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-gray-500">Joined:</span>
                          <span className="ml-1 font-medium">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Active:</span>
                          <span className="ml-1 font-medium">
                            {formatTimeAgo(user.last_active)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Messages:</span>
                          <span className="ml-1 font-medium">{user.total_messages}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Blocked:</span>
                          <span className="ml-1 font-medium text-red-600">{user.blocked_messages}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-gray-500">Safety Score:</span>
                          <span className={`ml-1 font-medium ${
                            user.safety_score_avg >= 80 ? 'text-green-600' :
                            user.safety_score_avg >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {user.safety_score_avg}/100
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Warnings:</span>
                          <span className="ml-1 font-medium">{user.warnings_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Block Rate:</span>
                          <span className="ml-1 font-medium">
                            {user.total_messages > 0 ? 
                              Math.round((user.blocked_messages / user.total_messages) * 100) : 0}%
                          </span>
                        </div>
                      </div>

                      {user.restrictions.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Active Restrictions:</h5>
                          {user.restrictions.map((restriction, index) => (
                            <div key={index} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-300">
                              <span className="font-medium capitalize">{restriction.type.replace('_', ' ')}</span>
                              {restriction.expires_at && !restriction.is_permanent && (
                                <span className="ml-2 text-gray-500">
                                  (expires {new Date(restriction.expires_at).toLocaleDateString()})
                                </span>
                              )}
                              {restriction.is_permanent && (
                                <span className="ml-2 text-red-600">(permanent)</span>
                              )}
                              <div className="mt-1 text-gray-600">{restriction.reason}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {user.violation_history.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Recent Violations:</h5>
                          <div className="space-y-1">
                            {user.violation_history.slice(0, 3).map((violation, index) => (
                              <div key={index} className="text-xs text-gray-600">
                                <span className="font-medium">{violation.violation_type}</span>
                                <span className="mx-1">•</span>
                                <span>{new Date(violation.date).toLocaleDateString()}</span>
                                <span className="mx-1">•</span>
                                <span>{violation.action_taken}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Moderation Settings
          </h2>

          {loading ? (
            <div className="text-center py-8">Loading settings...</div>
          ) : settings ? (
            <>
              {/* Safety Thresholds */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Safety Thresholds
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto-Flag Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.safety_thresholds.auto_flag_threshold}
                      onChange={(e) => setSettings({
                        ...settings,
                        safety_thresholds: {
                          ...settings.safety_thresholds,
                          auto_flag_threshold: parseInt(e.target.value)
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Safety score below this triggers auto-flagging
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto-Block Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.safety_thresholds.auto_block_threshold}
                      onChange={(e) => setSettings({
                        ...settings,
                        safety_thresholds: {
                          ...settings.safety_thresholds,
                          auto_block_threshold: parseInt(e.target.value)
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Safety score below this automatically blocks content
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Crisis Escalation Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={settings.safety_thresholds.crisis_escalation_threshold}
                      onChange={(e) => setSettings({
                        ...settings,
                        safety_thresholds: {
                          ...settings.safety_thresholds,
                          crisis_escalation_threshold: parseInt(e.target.value)
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Crisis severity level for automatic escalation
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => updateSettings({ safety_thresholds: settings.safety_thresholds })}
                  >
                    Update Thresholds
                  </Button>
                </div>
              </Card>

              {/* Flagged Terms */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Flagged Terms Management
                </h3>
                <div className="space-y-4">
                  {settings.flagged_terms.map((term) => (
                    <div key={term.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{term.term}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            term.category === 'drugs' ? 'text-red-600 bg-red-100' :
                            term.category === 'dealing' ? 'text-red-600 bg-red-100' :
                            term.category === 'predatory' ? 'text-orange-600 bg-orange-100' :
                            'text-yellow-600 bg-yellow-100'
                          }`}>
                            {term.category}
                          </span>
                          <span className="text-sm text-gray-500">
                            Severity: {term.severity}
                          </span>
                          {term.is_regex && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              Regex
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={term.is_active}
                            onChange={(e) => {
                              const updatedTerms = settings.flagged_terms.map(t =>
                                t.id === term.id ? { ...t, is_active: e.target.checked } : t
                              );
                              setSettings({
                                ...settings,
                                flagged_terms: updatedTerms
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => updateSettings({ flagged_terms: settings.flagged_terms })}
                  >
                    Update Flagged Terms
                  </Button>
                </div>
              </Card>

              {/* Automation Rules */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Automation Rules
                </h3>
                <div className="space-y-4">
                  {settings.automation_rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="mb-1">
                          <span className="font-medium">{rule.rule_name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">If:</span> {rule.condition}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Then:</span> {rule.action}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={rule.is_active}
                            onChange={(e) => {
                              const updatedRules = settings.automation_rules.map(r =>
                                r.id === rule.id ? { ...r, is_active: e.target.checked } : r
                              );
                              setSettings({
                                ...settings,
                                automation_rules: updatedRules
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => updateSettings({ automation_rules: settings.automation_rules })}
                  >
                    Update Automation Rules
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Settings Unavailable
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Unable to load moderation settings.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Flagged Content Review Modal */}
      {selectedFlaggedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Review Flagged Content
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium">Content Type:</span>
                  <span className="capitalize">{selectedFlaggedContent.content_type}</span>
                  <span className="font-medium ml-4">Safety Score:</span>
                  <span className={`font-bold ${
                    selectedFlaggedContent.safety_score >= 80 ? 'text-green-600' :
                    selectedFlaggedContent.safety_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {selectedFlaggedContent.safety_score}/100
                  </span>
                </div>
                
                <div className="mb-3">
                  <span className="font-medium">From:</span>
                  <span className="ml-1">
                    {selectedFlaggedContent.user_info.display_name} 
                    (@{selectedFlaggedContent.user_info.username})
                  </span>
                </div>

                <div className="mb-3">
                  <span className="font-medium">Content:</span>
                  <div className="mt-1 p-3 bg-white border rounded">
                    {selectedFlaggedContent.full_content || selectedFlaggedContent.content_preview}
                  </div>
                </div>

                <div className="mb-3">
                  <span className="font-medium">Flagged Terms:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFlaggedContent.flagged_terms.map((term, index) => (
                      <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-medium">Violations:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFlaggedContent.violation_types.map((violation, index) => (
                      <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                        {violation.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Add notes about your review decision..."
                  className="w-full p-2 border border-gray-300 rounded-md h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => reviewFlaggedContent(selectedFlaggedContent.id, 'approve')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Approve Content
              </Button>
              <Button
                onClick={() => reviewFlaggedContent(selectedFlaggedContent.id, 'dismiss')}
                variant="outline"
                className="flex-1"
              >
                Dismiss Flag
              </Button>
              <Button
                onClick={() => reviewFlaggedContent(selectedFlaggedContent.id, 'escalate')}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Escalate
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFlaggedContent(null);
                  setActionReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Manage User: {selectedUser.display_name}
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div><strong>Username:</strong> @{selectedUser.username}</div>
                <div><strong>Role:</strong> {selectedUser.role}</div>
                <div><strong>Safety Score:</strong> {selectedUser.safety_score_avg}/100</div>
                <div><strong>Warnings:</strong> {selectedUser.warnings_count}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select an action</option>
                  <option value="warn">Issue Warning</option>
                  <option value="temporary_mute">Temporary Mute</option>
                  <option value="permanent_mute">Permanent Mute</option>
                  <option value="temporary_ban">Temporary Ban</option>
                  <option value="permanent_ban">Permanent Ban</option>
                  <option value="remove_restrictions">Remove All Restrictions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explain the reason for this action..."
                  className="w-full p-2 border border-gray-300 rounded-md h-20 resize-none"
                  required
                />
              </div>

              {(actionType === 'temporary_mute' || actionType === 'temporary_ban') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={actionDuration}
                    onChange={(e) => setActionDuration(e.target.value)}
                    placeholder="e.g., 24"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => updateUserRestriction(selectedUser.id, actionType)}
                disabled={!actionType || !actionReason}
                className="flex-1"
              >
                Apply Action
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUser(null);
                  setActionType('');
                  setActionReason('');
                  setActionDuration('');
                }}
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

export default ModerationDashboard;