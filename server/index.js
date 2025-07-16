const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import enhanced security middleware
const {
  enforceHTTPS,
  securityHeaders,
  contentSecurityPolicy,
  corsMiddleware,
  requestSizeLimits,
  generalRateLimit,
  securityMonitoring
} = require('./middleware/security');

// Import enhanced error handling
const ErrorHandler = require('./middleware/errorHandler');

// Import session management
const { trackActivity } = require('./middleware/sessionManagement');

// Import API versioning
const { versionMiddleware, transformResponse } = require('./middleware/apiVersioning');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const programRoutes = require('./routes/programs');
const communityRoutes = require('./routes/community');
const crisisRoutes = require('./routes/crisis');
const crisisSupportRoutes = require('./routes/crisisSupport');
const messagingRoutes = require('./routes/messaging');
const moderationRoutes = require('./routes/moderation');
const notificationRoutes = require('./routes/notifications');
const blockerRoutes = require('./routes/blocker');
const extensionRoutes = require('./routes/extension');
const apiRoutes = require('./routes/api');
const gamificationRoutes = require('./routes/gamification');
const extendedGamificationRoutes = require('./routes/extended-gamification');
const mentorProgramRoutes = require('./routes/mentor-program');
const dashboardRoutes = require('./routes/dashboard');
const calendarRoutes = require('./routes/calendar');
const financialRoutes = require('./routes/financial');
const notificationSystemRoutes = require('./routes/notificationSystem');
const chatbotRoutes = require('./routes/chatbot');
const subscriptionRoutes = require('./routes/subscriptions');
const webhookRoutes = require('./routes/webhooks');

const { authenticateSocket } = require('./middleware/auth');
const { performanceMiddleware, cacheMiddleware } = require('./middleware/performance');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Enhanced Security Middleware Stack
// Order is important - apply security measures before other middleware

// 1. HTTPS Enforcement (must be first)
app.use(enforceHTTPS);

// 2. Security monitoring and suspicious pattern detection
app.use(securityMonitoring);

// 3. Request size limits (before body parsing)
app.use(requestSizeLimits);

// 4. General rate limiting (before specific route limits)
app.use(generalRateLimit);

// 5. Security headers
app.use(securityHeaders);

// 6. Content Security Policy
app.use(contentSecurityPolicy);

// 7. Enhanced CORS with origin validation
app.use(corsMiddleware);

// 8. Performance optimizations
app.use(performanceMiddleware.compression);
app.use(performanceMiddleware.requestTiming);
app.use(performanceMiddleware.memoryMonitor);
app.use(performanceMiddleware.optimizeQuery);
app.use(performanceMiddleware.optimizePagination);

// 9. Helmet for additional security headers (complementing our custom ones)
app.use(helmet({
  // Disable helmet's CSP since we have our own enhanced version
  contentSecurityPolicy: false,
  // Disable helmet's CORS since we have our own enhanced version
  crossOriginResourcePolicy: false,
  // Keep other helmet protections
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// Body parsing middleware with dynamic limits
app.use((req, res, next) => {
  const limits = req.bodyLimits || {
    json: '10mb',
    urlencoded: '10mb'
  };
  
  express.json({ limit: limits.json })(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ extended: true, limit: limits.urlencoded })(req, res, next);
  });
});

// Session activity tracking (after authentication middleware in routes)
app.use(trackActivity);

// API versioning middleware (before routes)
app.use('/api', versionMiddleware);
app.use('/api', transformResponse);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api', apiRoutes); // API management routes (version info, health, etc.)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/community', cacheMiddleware.community, communityRoutes);
app.use('/api/crisis', crisisRoutes);
app.use('/api/crisis-support', crisisSupportRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/blocker', blockerRoutes);
app.use('/api/extension', extensionRoutes);
app.use('/api/gamification', cacheMiddleware.static, gamificationRoutes);
app.use('/api/extended-gamification', cacheMiddleware.static, extendedGamificationRoutes);
app.use('/api/mentor-program', mentorProgramRoutes);
app.use('/api/dashboard', cacheMiddleware.dashboard, dashboardRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/notification-system', notificationSystemRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/subscriptions', cacheMiddleware.subscriptions, subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);

// Socket.io for real-time features
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  socket.join(`user_${socket.userId}`);
  
  // Join user's conversations
  socket.on('join_conversations', async (conversationIds) => {
    try {
      // Verify user has access to these conversations
      if (Array.isArray(conversationIds)) {
        for (const conversationId of conversationIds) {
          socket.join(`conversation_${conversationId}`);
        }
      }
    } catch (error) {
      console.error('Join conversations error:', error);
    }
  });
  
  // Handle new message events
  socket.on('new_message', (data) => {
    // Broadcast to conversation participants
    socket.to(`conversation_${data.conversationId}`).emit('message_received', {
      messageId: data.messageId,
      conversationId: data.conversationId,
      senderId: socket.userId,
      content: data.content,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle typing indicators
  socket.on('typing_start', (data) => {
    if (data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        username: socket.user?.username
      });
    } else if (data.groupId) {
      socket.to(`group_${data.groupId}`).emit('user_typing', {
        userId: socket.userId,
        groupId: data.groupId
      });
    }
  });
  
  socket.on('typing_stop', (data) => {
    if (data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
    } else if (data.groupId) {
      socket.to(`group_${data.groupId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        groupId: data.groupId
      });
    }
  });
  
  // Handle message safety alerts
  socket.on('message_flagged', (data) => {
    // Notify moderators about flagged messages
    socket.to('moderators').emit('message_flagged_alert', {
      messageId: data.messageId,
      conversationId: data.conversationId,
      flaggedTerms: data.flaggedTerms,
      severity: data.severity,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('join_crisis_room', () => {
    socket.join('crisis_interventions');
  });
  
  socket.on('join_moderator_room', () => {
    // TODO: Verify user is a moderator
    socket.join('moderators');
  });
  
  socket.on('join_community_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });
  
  socket.on('crisis_alert', (data) => {
    socket.to('crisis_interventions').emit('new_crisis_alert', {
      userId: socket.userId,
      ...data,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Enhanced error handling middleware
app.use(ErrorHandler.handle);

// Enhanced 404 handler
app.use('*', ErrorHandler.notFound);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RecovR server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server accessible at: http://localhost:${PORT} and http://0.0.0.0:${PORT}`);
});

module.exports = { app, server, io };