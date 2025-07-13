-- RecovR Database Schema
-- Multi-addiction recovery platform with community support and crisis intervention

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Browser extension registrations table
CREATE TABLE registered_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    extension_id VARCHAR(255) NOT NULL, -- Browser extension ID
    extension_token VARCHAR(255) NOT NULL UNIQUE, -- Secure token for authentication
    manifest JSONB NOT NULL, -- Extension manifest data
    fingerprint VARCHAR(255) NOT NULL, -- Extension fingerprint for integrity checking
    browser_info JSONB DEFAULT '{}', -- Browser and environment information
    metadata JSONB DEFAULT '{}', -- Additional extension metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked', 'pending_review')),
    requires_review BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_auth_at TIMESTAMP NULL,
    
    -- Composite unique constraint to prevent duplicate registrations
    UNIQUE(user_id, extension_id)
);

-- Index for performance
CREATE INDEX idx_registered_extensions_user_id ON registered_extensions(user_id);
CREATE INDEX idx_registered_extensions_status ON registered_extensions(status);
CREATE INDEX idx_registered_extensions_token ON registered_extensions(extension_token);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP NULL,
    profile_picture_url VARCHAR(500),
    bio TEXT,
    privacy_settings JSONB DEFAULT '{"profile_visibility": "private", "progress_sharing": false}',
    crisis_contacts JSONB DEFAULT '[]',
    preferences JSONB DEFAULT '{}',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
    moderator_permissions JSONB DEFAULT '[]',
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP NULL,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Gamification fields
    achievement_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    total_money_saved DECIMAL(10,2) DEFAULT 0.00,
    recovery_score INTEGER DEFAULT 0
);

-- Addiction types table
CREATE TABLE addiction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recovery programs table
CREATE TABLE recovery_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addiction_type_id UUID NOT NULL REFERENCES addiction_types(id),
    program_name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    target_duration_days INTEGER,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_relapse_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'discontinued')),
    notes TEXT,
    milestones JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily check-ins table
CREATE TABLE daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES recovery_programs(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
    cravings_intensity INTEGER CHECK (cravings_intensity >= 0 AND cravings_intensity <= 10),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    exercise_minutes INTEGER DEFAULT 0,
    meditation_minutes INTEGER DEFAULT 0,
    journal_entry TEXT,
    triggers JSONB DEFAULT '[]',
    coping_strategies_used JSONB DEFAULT '[]',
    support_system_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, program_id, checkin_date)
);

-- Community groups table
CREATE TABLE community_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    addiction_type_id UUID REFERENCES addiction_types(id),
    created_by UUID NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT true,
    member_count INTEGER DEFAULT 0,
    group_rules TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group memberships table
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, group_id)
);

-- Community posts table
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
    title VARCHAR(300),
    content TEXT NOT NULL,
    post_type VARCHAR(20) DEFAULT 'general' CHECK (post_type IN ('general', 'milestone', 'support_request', 'inspiration', 'question')),
    is_anonymous BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post comments table
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id),
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crisis interventions table
CREATE TABLE crisis_interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crisis_type VARCHAR(50) NOT NULL CHECK (crisis_type IN ('relapse_risk', 'mental_health', 'substance_emergency', 'suicidal_thoughts', 'other')),
    severity_level INTEGER NOT NULL CHECK (severity_level >= 1 AND severity_level <= 5),
    description TEXT,
    location_data JSONB,
    emergency_contacts_notified BOOLEAN DEFAULT false,
    professional_help_contacted BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Crisis resources table
CREATE TABLE crisis_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('hotline', 'website', 'app', 'local_service', 'emergency')),
    contact_info VARCHAR(500),
    url VARCHAR(500),
    availability VARCHAR(100),
    is_24_7 BOOLEAN DEFAULT false,
    languages_supported JSONB DEFAULT '["English"]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support network table
CREATE TABLE support_network (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    supporter_name VARCHAR(200),
    supporter_email VARCHAR(255),
    supporter_phone VARCHAR(20),
    relationship VARCHAR(100),
    role VARCHAR(50) DEFAULT 'supporter' CHECK (role IN ('supporter', 'sponsor', 'therapist', 'family', 'friend', 'mentor')),
    can_receive_crisis_alerts BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress tracking table
CREATE TABLE progress_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES recovery_programs(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,2),
    metric_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('milestone', 'reminder', 'community', 'crisis', 'system')),
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    is_revoked BOOLEAN DEFAULT false
);

-- Email verification tokens table
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    CONSTRAINT unique_active_token_per_user UNIQUE(user_id)
);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    ip_address INET,
    user_agent TEXT
);

-- Security audit log table
CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login attempts tracking table
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security tables
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE INDEX idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX idx_security_audit_log_severity ON security_audit_log(severity);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);

-- Insert default addiction types
INSERT INTO addiction_types (name, description, icon, color) VALUES
('Alcohol', 'Alcohol addiction and dependency', 'wine', '#EF4444'),
('Nicotine', 'Cigarettes, vaping, and tobacco products', 'cigarette', '#F59E0B'),
('Substance', 'Illegal drugs and prescription drug abuse', 'pills', '#8B5CF6'),
('Gambling', 'Gambling addiction and compulsive betting', 'dice', '#10B981'),
('Gaming', 'Video game and internet addiction', 'gamepad', '#3B82F6'),
('Social Media', 'Social media and technology addiction', 'smartphone', '#F97316'),
('Food', 'Food addiction and eating disorders', 'utensils', '#84CC16'),
('Shopping', 'Compulsive shopping and spending', 'shopping-cart', '#EC4899'),
('Sex', 'Sexual addiction and compulsive behaviors', 'heart', '#F43F5E'),
('Work', 'Work addiction and overworking', 'briefcase', '#6B7280');

-- Crisis support posts table (separate from community posts for priority handling)
CREATE TABLE crisis_support_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300),
    content TEXT NOT NULL,
    crisis_level INTEGER NOT NULL CHECK (crisis_level >= 1 AND crisis_level <= 5),
    support_type VARCHAR(50) NOT NULL CHECK (support_type IN ('immediate_help', 'peer_support', 'resource_request', 'check_in')),
    is_anonymous BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    professional_response_needed BOOLEAN DEFAULT false,
    emergency_services_contacted BOOLEAN DEFAULT false,
    responder_ids JSONB DEFAULT '[]',
    location_data JSONB,
    response_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crisis support responses table
CREATE TABLE crisis_support_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES crisis_support_posts(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_type VARCHAR(20) NOT NULL CHECK (response_type IN ('peer_support', 'resource_sharing', 'professional_referral', 'check_in')),
    content TEXT NOT NULL,
    is_professional BOOLEAN DEFAULT false,
    professional_credentials VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emergency contact log table
CREATE TABLE emergency_contact_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crisis_post_id UUID REFERENCES crisis_support_posts(id),
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('emergency_services', 'crisis_hotline', 'local_professional', 'emergency_contact')),
    contact_info VARCHAR(500),
    was_successful BOOLEAN,
    notes TEXT,
    contacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default crisis resources
INSERT INTO crisis_resources (title, description, resource_type, contact_info, availability, is_24_7) VALUES
('National Suicide Prevention Lifeline', '24/7 crisis support for suicidal thoughts', 'hotline', '988', '24/7', true),
('Crisis Text Line', 'Text-based crisis support', 'hotline', 'Text HOME to 741741', '24/7', true),
('SAMHSA National Helpline', 'Substance abuse and mental health services', 'hotline', '1-800-662-4357', '24/7', true),
('National Sexual Assault Hotline', 'Support for sexual assault survivors', 'hotline', '1-800-656-4673', '24/7', true),
('National Domestic Violence Hotline', 'Support for domestic violence situations', 'hotline', '1-800-799-7233', '24/7', true),
('NAMI HelpLine', 'Mental health information and support', 'hotline', '1-800-950-6264', 'M-F 10am-10pm ET', false),
('Addiction Recovery Helpline', '24/7 addiction and recovery support', 'hotline', '1-844-289-0879', '24/7', true);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_recovery_programs_user_id ON recovery_programs(user_id);
CREATE INDEX idx_daily_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX idx_daily_checkins_date ON daily_checkins(checkin_date);
CREATE INDEX idx_community_posts_group_id ON community_posts(group_id);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_crisis_interventions_user_id ON crisis_interventions(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Content blocker tables
CREATE TABLE blocked_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('website', 'app', 'keyword', 'category')),
    content_value VARCHAR(500) NOT NULL,
    block_level VARCHAR(20) DEFAULT 'strict' CHECK (block_level IN ('lenient', 'moderate', 'strict')),
    schedule JSONB DEFAULT '{"always": true}',
    is_active BOOLEAN DEFAULT true,
    bypass_attempts INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Block sessions table for tracking active blocking periods
CREATE TABLE block_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(200),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    block_categories JSONB DEFAULT '[]',
    emergency_contacts JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Block attempts table for monitoring bypass attempts
CREATE TABLE block_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_content_id UUID REFERENCES blocked_content(id) ON DELETE CASCADE,
    attempted_url VARCHAR(1000),
    attempt_type VARCHAR(20) CHECK (attempt_type IN ('access', 'bypass', 'override')),
    was_successful BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predefined content categories table
CREATE TABLE content_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category_type VARCHAR(50) NOT NULL,
    default_keywords JSONB DEFAULT '[]',
    default_websites JSONB DEFAULT '[]',
    icon VARCHAR(100),
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default content categories for addiction recovery
INSERT INTO content_categories (name, description, category_type, default_keywords, default_websites) VALUES
('Social Media', 'Block social media platforms and apps', 'addiction_trigger', 
 '["facebook", "instagram", "twitter", "tiktok", "snapchat", "linkedin"]',
 '["facebook.com", "instagram.com", "twitter.com", "tiktok.com", "snapchat.com", "linkedin.com"]'),
('Gaming', 'Block gaming websites and platforms', 'addiction_trigger',
 '["steam", "gaming", "twitch", "discord", "xbox", "playstation"]',
 '["steam.com", "twitch.tv", "discord.com", "xbox.com", "playstation.com"]'),
('Shopping', 'Block shopping and e-commerce sites', 'addiction_trigger',
 '["amazon", "ebay", "shopping", "buy", "purchase", "cart"]',
 '["amazon.com", "ebay.com", "walmart.com", "target.com", "bestbuy.com"]'),
('Adult Content', 'Block adult and inappropriate content', 'harmful_content',
 '["porn", "adult", "xxx", "sex", "nsfw"]',
 '["pornhub.com", "xvideos.com", "redtube.com"]'),
('Gambling', 'Block gambling and betting websites', 'addiction_trigger',
 '["casino", "poker", "betting", "gambling", "slots", "lottery"]',
 '["bet365.com", "pokerstars.com", "casino.com", "draftkings.com"]'),
('Alcohol & Substances', 'Block alcohol and substance-related content', 'addiction_trigger',
 '["alcohol", "beer", "wine", "liquor", "drugs", "weed", "marijuana"]',
 '["totalwine.com", "drizly.com", "wine.com"]');

-- Create indexes for content blocker
CREATE INDEX idx_blocked_content_user_id ON blocked_content(user_id);
CREATE INDEX idx_blocked_content_type ON blocked_content(content_type);
CREATE INDEX idx_block_sessions_user_id ON block_sessions(user_id);
CREATE INDEX idx_block_attempts_user_id ON block_attempts(user_id);
CREATE INDEX idx_block_attempts_content_id ON block_attempts(blocked_content_id);

-- Gamification and achievement system tables
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_key VARCHAR(100) NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(user_id, achievement_key)
);

-- Daily challenges and motivational content
CREATE TABLE daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL CHECK (challenge_type IN ('mindfulness', 'physical', 'social', 'learning', 'creativity')),
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    points_reward INTEGER DEFAULT 10,
    instructions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User's daily challenge attempts
CREATE TABLE user_daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
    challenge_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'started' CHECK (status IN ('started', 'completed', 'skipped')),
    completion_notes TEXT,
    completion_photo_url VARCHAR(500),
    points_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, challenge_id, challenge_date)
);

-- Motivational quotes and content
CREATE TABLE motivational_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('quote', 'tip', 'fact', 'affirmation')),
    title VARCHAR(200),
    content TEXT NOT NULL,
    author VARCHAR(100),
    category VARCHAR(100), -- e.g., 'recovery', 'motivation', 'mindfulness'
    addiction_types JSONB DEFAULT '[]', -- Which addiction types this applies to
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    rating_sum INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User's journal entries (like QUITTR's reflection system)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content TEXT NOT NULL,
    mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 10),
    craving_intensity INTEGER CHECK (craving_intensity BETWEEN 0 AND 10),
    gratitude_notes TEXT,
    trigger_notes TEXT,
    reflection_prompts JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    is_private BOOLEAN DEFAULT true,
    entry_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Money saved tracking (financial motivation like QUITTR)
CREATE TABLE money_saved_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES recovery_programs(id) ON DELETE CASCADE,
    amount_saved DECIMAL(10,2) NOT NULL,
    calculation_method VARCHAR(50) NOT NULL, -- 'daily_cost', 'weekly_cost', 'manual'
    daily_cost DECIMAL(10,2), -- How much they used to spend per day
    notes TEXT,
    saved_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health improvements tracking
CREATE TABLE health_improvements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    improvement_type VARCHAR(100) NOT NULL, -- 'sleep', 'energy', 'focus', 'mood', 'physical'
    improvement_description TEXT NOT NULL,
    severity_before INTEGER CHECK (severity_before BETWEEN 1 AND 10),
    severity_after INTEGER CHECK (severity_after BETWEEN 1 AND 10),
    notes TEXT,
    photo_url VARCHAR(500), -- For before/after photos
    improvement_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User level progression (like QUITTR's progression system)
CREATE TABLE user_level_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    experience_gained INTEGER NOT NULL,
    reason VARCHAR(100), -- 'streak_milestone', 'achievement', 'daily_activity'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for gamification tables
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at);
CREATE INDEX idx_user_daily_challenges_user_id ON user_daily_challenges(user_id);
CREATE INDEX idx_user_daily_challenges_date ON user_daily_challenges(challenge_date);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_money_saved_user_id ON money_saved_log(user_id);
CREATE INDEX idx_health_improvements_user_id ON health_improvements(user_id);
CREATE INDEX idx_user_level_history_user_id ON user_level_history(user_id);

-- Messaging and chat tables with safety features
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_type VARCHAR(20) DEFAULT 'private' CHECK (conversation_type IN ('private', 'group', 'support')),
    title VARCHAR(200),
    participants JSONB NOT NULL DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    is_monitored BOOLEAN DEFAULT true, -- All conversations monitored for safety
    safety_flags JSONB DEFAULT '[]',
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table with content analysis
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    safety_score INTEGER DEFAULT 0 CHECK (safety_score >= 0 AND safety_score <= 100),
    flagged_content JSONB DEFAULT '[]', -- Array of flagged terms/patterns
    is_blocked BOOLEAN DEFAULT false,
    moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'blocked')),
    parent_message_id UUID REFERENCES messages(id), -- For replies/threads
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Safety monitoring table for tracking suspicious activity
CREATE TABLE message_safety_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN (
        'drug_dealing', 'substance_offering', 'suspicious_contact_exchange', 
        'predatory_behavior', 'spam', 'harassment', 'inappropriate_content'
    )),
    severity_level INTEGER NOT NULL CHECK (severity_level >= 1 AND severity_level <= 5),
    auto_detected BOOLEAN DEFAULT true,
    flagged_terms JSONB DEFAULT '[]',
    action_taken VARCHAR(50) DEFAULT 'flagged' CHECK (action_taken IN (
        'flagged', 'blocked', 'user_warned', 'user_suspended', 'reported_authorities'
    )),
    moderator_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User message restrictions table
CREATE TABLE user_messaging_restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restriction_type VARCHAR(30) NOT NULL CHECK (restriction_type IN (
        'temporary_mute', 'messaging_disabled', 'supervised_only', 'banned'
    )),
    reason TEXT NOT NULL,
    restricted_until TIMESTAMP,
    is_permanent BOOLEAN DEFAULT false,
    applied_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message reports table
CREATE TABLE message_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL CHECK (report_type IN (
        'drug_dealing', 'harassment', 'spam', 'inappropriate', 'predatory', 'other'
    )),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    action_taken TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flagged terms and patterns for content analysis
CREATE TABLE flagged_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term VARCHAR(200) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'drugs', 'dealing', 'contact_exchange', 'predatory', 'spam', 'harmful'
    )),
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
    is_regex BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert flagged terms for drug dealing and harmful content detection
INSERT INTO flagged_terms (term, category, severity) VALUES
-- Drug dealing terms
('buy.*drugs', 'dealing', 5),
('sell.*drugs', 'dealing', 5),
('dealer', 'dealing', 4),
('supply', 'dealing', 3),
('product.*available', 'dealing', 4),
('discreet.*delivery', 'dealing', 5),
('cash.*only', 'dealing', 3),
('meet.*privately', 'dealing', 4),

-- Substance names
('cocaine', 'drugs', 4),
('heroin', 'drugs', 5),
('fentanyl', 'drugs', 5),
('meth', 'drugs', 4),
('pills.*cheap', 'drugs', 4),
('weed.*sale', 'drugs', 3),

-- Contact exchange patterns
('whatsapp.*me', 'contact_exchange', 3),
('text.*my.*number', 'contact_exchange', 3),
('dm.*for.*info', 'contact_exchange', 3),
('telegram.*@', 'contact_exchange', 4),

-- Predatory terms
('young.*user', 'predatory', 5),
('vulnerable.*easy', 'predatory', 5),
('take.*advantage', 'predatory', 4),

-- Spam patterns
('click.*here.*now', 'spam', 2),
('limited.*time.*offer', 'spam', 2),
('guaranteed.*results', 'spam', 2);

-- Moderation actions table
CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderator_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('user', 'message', 'post', 'comment', 'conversation')),
    target_id UUID NOT NULL,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN (
        'warn', 'mute', 'ban', 'delete_content', 'approve_content', 
        'flag_content', 'restrict_messaging', 'escalate_to_admin'
    )),
    reason TEXT NOT NULL,
    duration_hours INTEGER, -- NULL for permanent actions
    notes TEXT,
    automated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moderation queue for items requiring review
CREATE TABLE moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('message', 'post', 'comment', 'user_report')),
    item_id UUID NOT NULL,
    priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 5) DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'escalated')),
    assigned_to UUID REFERENCES users(id),
    violation_types JSONB DEFAULT '[]',
    safety_score INTEGER,
    auto_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    resolved_at TIMESTAMP
);

-- User warnings and strikes system
CREATE TABLE user_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warning_type VARCHAR(30) NOT NULL CHECK (warning_type IN (
        'content_violation', 'behavior_warning', 'safety_concern', 'spam', 'final_warning'
    )),
    description TEXT NOT NULL,
    issued_by UUID NOT NULL REFERENCES users(id),
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Global platform statistics
CREATE TABLE platform_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_users INTEGER DEFAULT 0,
    active_users_24h INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    flagged_messages INTEGER DEFAULT 0,
    blocked_messages INTEGER DEFAULT 0,
    crisis_posts INTEGER DEFAULT 0,
    safety_violations INTEGER DEFAULT 0,
    moderation_actions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stat_date)
);

-- Create indexes for messaging
CREATE INDEX idx_conversations_participants ON conversations USING GIN (participants);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_safety_score ON messages(safety_score);
CREATE INDEX idx_messages_flagged ON messages(is_blocked, moderation_status);
CREATE INDEX idx_message_safety_logs_user_id ON message_safety_logs(user_id);
CREATE INDEX idx_message_safety_logs_violation ON message_safety_logs(violation_type, severity_level);
CREATE INDEX idx_user_messaging_restrictions_user_id ON user_messaging_restrictions(user_id);
CREATE INDEX idx_message_reports_status ON message_reports(status, created_at);
CREATE INDEX idx_flagged_terms_category ON flagged_terms(category, is_active);

-- Create indexes for moderation
CREATE INDEX idx_moderation_actions_moderator_id ON moderation_actions(moderator_id);
CREATE INDEX idx_moderation_actions_target ON moderation_actions(target_type, target_id);
CREATE INDEX idx_moderation_actions_created_at ON moderation_actions(created_at DESC);
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status, priority DESC);
CREATE INDEX idx_moderation_queue_assigned_to ON moderation_queue(assigned_to);
CREATE INDEX idx_moderation_queue_created_at ON moderation_queue(created_at DESC);
CREATE INDEX idx_user_warnings_user_id ON user_warnings(user_id);
CREATE INDEX idx_user_warnings_severity ON user_warnings(severity, created_at DESC);
CREATE INDEX idx_platform_stats_date ON platform_stats(stat_date DESC);

-- Create indexes for crisis support
CREATE INDEX idx_crisis_support_posts_user_id ON crisis_support_posts(user_id);
CREATE INDEX idx_crisis_support_posts_crisis_level ON crisis_support_posts(crisis_level);
CREATE INDEX idx_crisis_support_posts_unresolved ON crisis_support_posts(is_resolved, created_at);
CREATE INDEX idx_crisis_support_responses_post_id ON crisis_support_responses(post_id);
CREATE INDEX idx_emergency_contact_log_user_id ON emergency_contact_log(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recovery_programs_updated_at BEFORE UPDATE ON recovery_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_groups_updated_at BEFORE UPDATE ON community_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON post_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blocked_content_updated_at BEFORE UPDATE ON blocked_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crisis_support_posts_updated_at BEFORE UPDATE ON crisis_support_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger tracking table for calendar integration
CREATE TABLE trigger_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_date DATE NOT NULL DEFAULT CURRENT_DATE,
    trigger_type VARCHAR(100) NOT NULL, -- 'stress', 'boredom', 'social_pressure', 'emotional', etc.
    intensity_level INTEGER NOT NULL CHECK (intensity_level BETWEEN 1 AND 10),
    situation_description TEXT,
    coping_strategy_used TEXT,
    outcome VARCHAR(50), -- 'avoided', 'relapse', 'redirected', 'sought_help'
    notes TEXT,
    location_context VARCHAR(200), -- 'home', 'work', 'social_event', etc.
    time_of_day TIME,
    duration_minutes INTEGER, -- How long the trigger lasted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for trigger logs
CREATE INDEX idx_trigger_logs_user_id ON trigger_logs(user_id);
CREATE INDEX idx_trigger_logs_date ON trigger_logs(trigger_date);
CREATE INDEX idx_trigger_logs_type ON trigger_logs(trigger_type);
CREATE INDEX idx_trigger_logs_intensity ON trigger_logs(intensity_level);

-- Update the recovery_programs table to add daily_cost for money tracking
ALTER TABLE recovery_programs 
ADD COLUMN IF NOT EXISTS daily_cost DECIMAL(10,2) DEFAULT 0.00;