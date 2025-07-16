-- Performance Optimization Indexes for RecovR Platform
-- These indexes improve query performance for common operations

-- User-related indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_plan ON users (subscription_plan);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_verified ON users (is_active, is_verified);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users (last_login);

-- Recovery programs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recovery_programs_user_status ON recovery_programs (user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recovery_programs_addiction_type ON recovery_programs (addiction_type_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recovery_programs_start_date ON recovery_programs (start_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recovery_programs_current_streak ON recovery_programs (current_streak DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recovery_programs_longest_streak ON recovery_programs (longest_streak DESC);

-- Daily check-ins indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins (user_id, checkin_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_program_date ON daily_checkins (program_id, checkin_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_mood_rating ON daily_checkins (mood_rating);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_recent ON daily_checkins (checkin_date DESC) WHERE checkin_date >= CURRENT_DATE - INTERVAL '30 days';

-- Community groups indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_groups_public ON community_groups (is_public, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_groups_addiction_type ON community_groups (addiction_type_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_groups_creator ON community_groups (created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_groups_member_count ON community_groups (member_count DESC);

-- Group memberships indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_memberships_user_status ON group_memberships (user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_memberships_group_status ON group_memberships (group_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_memberships_joined_at ON group_memberships (joined_at DESC);

-- Community posts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_posts_group_created ON community_posts (group_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_posts_user_created ON community_posts (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_posts_type ON community_posts (post_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_posts_anonymous ON community_posts (is_anonymous);

-- Post comments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_post_created ON post_comments (post_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_user_created ON post_comments (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_parent ON post_comments (parent_comment_id);

-- Messages indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_created ON messages (sender_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_read_status ON messages (conversation_id, is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recent ON messages (created_at DESC) WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Conversations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_participants ON conversations USING GIN (participants);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated ON conversations (updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_active ON conversations (is_active);

-- Achievements indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievements_category ON achievements (category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievements_points ON achievements (points DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievements_active ON achievements (is_active);

-- User achievements indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_achievements_user_earned ON user_achievements (user_id, earned_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_achievements_achievement ON user_achievements (achievement_id);

-- Crisis interventions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_interventions_user_created ON crisis_interventions (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_interventions_status ON crisis_interventions (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_interventions_severity ON crisis_interventions (severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_interventions_active ON crisis_interventions (status) WHERE status IN ('active', 'pending');

-- Subscription-related indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_active ON subscriptions (user_id, status) WHERE status IN ('active', 'trialing');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions (stripe_subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions (plan_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_expires ON subscriptions (current_period_end);

-- Payment history indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_user_created ON payment_history (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_status ON payment_history (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_amount ON payment_history (amount);

-- Referrals indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referrer_status ON referrals (referrer_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referred_status ON referrals (referred_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_code ON referrals (referral_code);

-- Audit logging indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_audit_log_user_event ON security_audit_log (user_id, event_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_audit_log_created ON security_audit_log (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_audit_log_severity ON security_audit_log (severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_audit_log_recent ON security_audit_log (created_at DESC) WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Content blocking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocked_content_user_created ON blocked_content (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocked_content_type ON blocked_content (content_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocked_content_active ON blocked_content (is_active);

-- Notification indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read_status ON notifications (user_id, is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications (notification_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_scheduled ON notifications (scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Session management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_active ON refresh_tokens (user_id, is_revoked, expires_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_session ON refresh_tokens (session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_active ON users (subscription_plan, subscription_status, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recovery_programs_user_addiction_status ON recovery_programs (user_id, addiction_type_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_user_program_date ON daily_checkins (user_id, program_id, checkin_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_posts_group_type_created ON community_posts (group_id, post_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_read_created ON messages (conversation_id, is_read, created_at DESC);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_posts_content_search ON community_posts USING gin(to_tsvector('english', content));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_groups_search ON community_groups USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievements_search ON achievements USING gin(to_tsvector('english', title || ' ' || description));

-- Partial indexes for better performance on common filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_verified_active ON users (created_at DESC) WHERE is_verified = true AND is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recovery_programs_active ON recovery_programs (current_streak DESC) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_groups_public_active ON community_groups (member_count DESC) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_active ON subscriptions (created_at DESC) WHERE status IN ('active', 'trialing');

-- Expression indexes for case-insensitive searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_ci ON users (LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_ci ON users (LOWER(username));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_groups_name_ci ON community_groups (LOWER(name));

-- Time-based partitioning preparation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_date_user ON daily_checkins (checkin_date, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_audit_log_date_user ON security_audit_log (DATE(created_at), user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_date_conversation ON messages (DATE(created_at), conversation_id);

-- Statistics for query planner
ANALYZE users;
ANALYZE recovery_programs;
ANALYZE daily_checkins;
ANALYZE community_groups;
ANALYZE community_posts;
ANALYZE messages;
ANALYZE subscriptions;
ANALYZE security_audit_log;

-- Maintenance commands (should be run periodically)
-- VACUUM ANALYZE;
-- REINDEX DATABASE recovr_db;