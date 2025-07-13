import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import MilestonePost from '../components/MilestonePost';
import TestimonialPost from '../components/TestimonialPost';
import CrisisSupportPost from '../components/CrisisSupportPost';

interface AddictionType {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  member_count: number;
  addiction_type_name: string;
  addiction_type_color: string;
  creator_username: string;
}

interface Post {
  id: string;
  title?: string;
  content: string;
  post_type: 'general' | 'milestone' | 'support_request' | 'inspiration' | 'question';
  author_name: string;
  author_username: string;
  author_profile_picture?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_anonymous: boolean;
}

const Community: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'my-groups' | 'feed'>('discover');
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [myGroups, setMyGroups] = useState<CommunityGroup[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchDiscoverGroups();
    } else if (activeTab === 'my-groups') {
      fetchMyGroups();
    } else if (activeTab === 'feed') {
      fetchCommunityFeed();
    }
  }, [activeTab]);

  const fetchDiscoverGroups = async () => {
    setLoading(true);
    try {
      const response = await api.get('/community/groups');
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    setLoading(true);
    try {
      const response = await api.get('/community/my-groups', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setMyGroups(response.data.groups);
    } catch (error) {
      console.error('Error fetching my groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityFeed = async () => {
    setLoading(true);
    try {
      // For now, we'll fetch posts from the first group the user is in
      if (myGroups.length > 0) {
        const response = await api.get(`/community/groups/${myGroups[0].id}/posts`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        setPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      await api.post(`/community/groups/${groupId}/join`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      // Refresh groups
      fetchDiscoverGroups();
      fetchMyGroups();
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'milestone': return 'bg-green-100 text-green-800';
      case 'support_request': return 'bg-red-100 text-red-800';
      case 'inspiration': return 'bg-blue-100 text-blue-800';
      case 'question': return 'bg-yellow-100 text-yellow-800';
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
          Community
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect with others on their recovery journey
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'discover', label: 'Discover Groups', icon: '🔍' },
            { key: 'my-groups', label: 'My Groups', icon: '👥' },
            { key: 'feed', label: 'Community Feed', icon: '📰' }
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

      {/* Discover Groups Tab */}
      {activeTab === 'discover' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Discover Support Groups
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading groups...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <Card key={group.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.addiction_type_color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {group.addiction_type_name}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {group.name}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {group.description}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {group.member_count} members
                      </span>
                      <Button 
                        size="sm" 
                        onClick={() => joinGroup(group.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Join Group
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Groups Tab */}
      {activeTab === 'my-groups' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Support Groups
          </h2>
          
          {loading ? (
            <div className="text-center py-8">Loading your groups...</div>
          ) : myGroups.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Groups Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Join some groups to connect with others on similar recovery journeys.
              </p>
              <Button onClick={() => setActiveTab('discover')}>
                Discover Groups
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myGroups.map((group) => (
                <Card key={group.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.addiction_type_color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {group.addiction_type_name}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {group.name}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {group.description}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {group.member_count} members
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedGroup(group.id);
                          setActiveTab('feed');
                        }}
                      >
                        View Posts
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Community Feed Tab */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Community Feed
            </h2>
            <Button onClick={() => setShowCreatePost(true)}>
              Create Post
            </Button>
          </div>

          {/* Share Options */}
          <div className="space-y-4">
            {/* Crisis Support - Always Visible */}
            <CrisisSupportPost onPostCreated={fetchCommunityFeed} />
            
            {/* Other Post Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MilestonePost groupId={selectedGroup || undefined} onPostCreated={fetchCommunityFeed} />
              <TestimonialPost groupId={selectedGroup || undefined} onPostCreated={fetchCommunityFeed} />
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading posts...</div>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Posts Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Be the first to share your story or ask for support.
              </p>
              <Button onClick={() => setShowCreatePost(true)}>
                Create First Post
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          {post.is_anonymous ? '👤' : '🙂'}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {post.is_anonymous ? 'Anonymous' : post.author_name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatTimeAgo(post.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPostTypeColor(post.post_type)}`}>
                        {post.post_type.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {post.title && (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {post.title}
                      </h3>
                    )}
                    
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center space-x-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600">
                        <span>❤️</span>
                        <span className="text-sm">{post.likes_count}</span>
                      </button>
                      <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600">
                        <span>💬</span>
                        <span className="text-sm">{post.comments_count}</span>
                      </button>
                      <button className="text-gray-500 hover:text-blue-600 text-sm">
                        Share Support
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Community;