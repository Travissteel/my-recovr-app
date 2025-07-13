import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import io, { Socket } from 'socket.io-client';

interface Conversation {
  id: string;
  conversation_type: 'private' | 'group' | 'support';
  title?: string;
  participants: string[];
  message_count: number;
  last_message_time?: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  safety_score: number;
  is_blocked: boolean;
  moderation_status: string;
  sender_name: string;
  sender_username: string;
  sender_profile_picture?: string;
  created_at: string;
}

interface MessagingRestriction {
  restriction_type: string;
  reason: string;
  restricted_until?: string;
  is_permanent: boolean;
}

const Messaging: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [restriction, setRestriction] = useState<MessagingRestriction | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchConversations();
    checkRestrictions();
    setupSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupSocket = () => {
    if (!user) return;

    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      auth: {
        token: accessToken
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to messaging socket');
      // Join user's conversations
      if (conversations.length > 0) {
        newSocket.emit('join_conversations', conversations.map(c => c.id));
      }
    });

    newSocket.on('message_received', (data) => {
      if (data.conversationId === selectedConversation) {
        setMessages(prev => [...prev, data]);
      }
      // Update conversation list to move this conversation to top
      fetchConversations();
    });

    newSocket.on('user_typing', (data) => {
      if (data.conversationId === selectedConversation && data.userId !== user.id) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      }
    });

    newSocket.on('user_stopped_typing', (data) => {
      if (data.conversationId === selectedConversation) {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }
    });

    setSocket(newSocket);
  };

  const fetchConversations = async () => {
    try {
      const response = await api.get('/messaging/conversations', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/messaging/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkRestrictions = async () => {
    try {
      // This would be part of user profile or a separate endpoint
      // For now, we'll handle restrictions in the message sending
    } catch (error) {
      console.error('Error checking restrictions:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || restriction) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const response = await api.post(
        `/messaging/conversations/${selectedConversation}/messages`,
        { content: messageContent },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.data.messageData) {
        // Message was sent successfully
        setMessages(prev => [...prev, response.data.messageData]);
        
        // Emit socket event for real-time delivery
        if (socket) {
          socket.emit('new_message', {
            messageId: response.data.messageData.id,
            conversationId: selectedConversation,
            content: messageContent
          });
        }
      } else if (response.data.safetyInfo?.isBlocked) {
        // Message was blocked
        alert('Your message was blocked due to policy violations. Please review our community guidelines.');
        
        if (response.data.safetyInfo.violations?.includes('drug_dealing')) {
          setRestriction({
            restriction_type: 'temporary_mute',
            reason: 'Message blocked for suspected drug dealing content',
            restricted_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            is_permanent: false
          });
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error.response?.data?.restriction) {
        setRestriction(error.response.data.restriction);
      } else if (error.response?.status === 400) {
        alert('Message blocked: ' + (error.response?.data?.message || 'Policy violation'));
      }
    }
  };

  const handleTyping = () => {
    if (socket && selectedConversation) {
      socket.emit('typing_start', { conversationId: selectedConversation });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversationId: selectedConversation });
      }, 3000);
    }
  };

  const reportMessage = async (messageId: string, reportType: string) => {
    try {
      await api.post(
        `/messaging/messages/${messageId}/report`,
        { reportType, description: 'Reported via UI' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      alert('Message reported successfully. Our moderation team will review it.');
    } catch (error) {
      console.error('Error reporting message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSafetyStatusColor = (message: Message) => {
    if (message.is_blocked) return 'text-red-600';
    if (message.moderation_status === 'flagged') return 'text-orange-600';
    if (message.safety_score < 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="flex h-screen max-h-screen">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Messages
            </h2>
            <Button size="sm" onClick={() => setShowNewConversation(true)}>
              New Chat
            </Button>
          </div>
          
          {/* Search */}
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {/* Restriction Warning */}
        {restriction && (
          <div className="p-3 bg-red-50 border-b border-red-200">
            <div className="text-sm text-red-800">
              <strong>Messaging Restricted</strong>
              <p className="text-xs mt-1">{restriction.reason}</p>
              {!restriction.is_permanent && restriction.restricted_until && (
                <p className="text-xs mt-1">
                  Until: {new Date(restriction.restricted_until).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations
            .filter(c => 
              !searchTerm || 
              c.title?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {conversation.title || `${conversation.conversation_type} Chat`}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {conversation.message_count} messages
                  </p>
                </div>
                {conversation.last_message_time && (
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(conversation.last_message_time)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedConv?.title || `${selectedConv?.conversation_type} Chat`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConv?.participants.length} participants
                  </p>
                </div>
                
                {/* Safety Info */}
                <div className="text-xs text-gray-500">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                    🛡️ Monitored for Safety
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading messages...</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${
                      message.sender_id === user?.id 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-900'
                    } rounded-lg p-3`}>
                      {message.sender_id !== user?.id && (
                        <div className="text-xs font-medium mb-1">
                          {message.sender_name}
                        </div>
                      )}
                      
                      <div className="text-sm">{message.content}</div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs opacity-75">
                          {formatTimeAgo(message.created_at)}
                        </span>
                        
                        {/* Safety indicators */}
                        <div className="flex items-center space-x-1">
                          {message.sender_id === user?.id && (
                            <span className={`text-xs ${getSafetyStatusColor(message)}`}>
                              {message.is_blocked ? '🚫' : 
                               message.moderation_status === 'flagged' ? '⚠️' : 
                               message.safety_score >= 90 ? '✅' : '⚡'}
                            </span>
                          )}
                          
                          {message.sender_id !== user?.id && (
                            <button
                              onClick={() => reportMessage(message.id, 'inappropriate')}
                              className="text-xs opacity-50 hover:opacity-100"
                              title="Report message"
                            >
                              🚩
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 rounded-lg p-3 max-w-xs">
                    <div className="text-sm text-gray-600">
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {restriction ? (
                <div className="text-center py-4">
                  <div className="text-red-600 text-sm">
                    Messaging is currently restricted: {restriction.reason}
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message... (monitored for safety)"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </Button>
                </div>
              )}
              
              {/* Safety Disclaimer */}
              <div className="mt-2 text-xs text-gray-500 text-center">
                All messages are monitored for safety. Drug dealing, harassment, and inappropriate content will be blocked.
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;