-- Mentor Program Database Schema
-- Supports free access incentives and lifetime membership

-- Mentors table - stores mentor applications and status
CREATE TABLE IF NOT EXISTS mentors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    motivation TEXT,
    specialties JSONB DEFAULT '[]'::jsonb, -- Areas of expertise/addiction types
    availability JSONB DEFAULT '{}'::jsonb, -- Availability schedule
    mentorship_experience TEXT,
    days_clean_at_application INTEGER NOT NULL,
    total_points INTEGER DEFAULT 0,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Mentor subscriptions - tracks free access and lifetime membership
CREATE TABLE IF NOT EXISTS mentor_subscriptions (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('free', 'premium', 'lifetime')),
    is_lifetime BOOLEAN DEFAULT FALSE,
    free_access_earned BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentor_id)
);

-- Mentor-mentee relationships
CREATE TABLE IF NOT EXISTS mentor_mentees (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'terminated')),
    completion_reason TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentee_id, status) -- Ensures one active mentor per mentee
);

-- Mentor activities - tracks engagement for free access eligibility
CREATE TABLE IF NOT EXISTS mentor_activities (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    mentee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    points_earned INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mentor reviews and feedback
CREATE TABLE IF NOT EXISTS mentor_reviews (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentor_id, reviewer_id) -- One review per mentor per user
);

-- Mentor achievements and badges
CREATE TABLE IF NOT EXISTS mentor_achievements (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(255) NOT NULL,
    description TEXT,
    badge_icon VARCHAR(10),
    points_value INTEGER DEFAULT 0,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Mentor program settings and configuration
CREATE TABLE IF NOT EXISTS mentor_program_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_status ON mentors(status);
CREATE INDEX IF NOT EXISTS idx_mentor_subscriptions_mentor_id ON mentor_subscriptions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_subscriptions_expires_at ON mentor_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_mentor_mentees_mentor_id ON mentor_mentees(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_mentees_mentee_id ON mentor_mentees(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_mentees_status ON mentor_mentees(status);
CREATE INDEX IF NOT EXISTS idx_mentor_activities_mentor_id ON mentor_activities(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_activities_created_at ON mentor_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_mentor_activities_activity_type ON mentor_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_mentor_reviews_mentor_id ON mentor_reviews(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_achievements_mentor_id ON mentor_achievements(mentor_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mentors_updated_at BEFORE UPDATE ON mentors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_subscriptions_updated_at BEFORE UPDATE ON mentor_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_mentees_updated_at BEFORE UPDATE ON mentor_mentees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_reviews_updated_at BEFORE UPDATE ON mentor_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default program settings
INSERT INTO mentor_program_settings (setting_key, setting_value, description) VALUES
('eligibility_days', '365', 'Minimum days clean required to become a mentor'),
('min_mentees_for_free_access', '2', 'Minimum number of active mentees required for free access'),
('min_monthly_activities', '10', 'Minimum monthly activities required for free access'),
('lifetime_membership_days', '730', 'Days of mentoring required for lifetime membership'),
('max_mentees_per_mentor', '5', 'Maximum number of mentees per mentor'),
('free_access_duration_months', '12', 'Duration of free access in months')
ON CONFLICT (setting_key) DO NOTHING;

-- Create a view for mentor statistics
CREATE OR REPLACE VIEW mentor_statistics AS
SELECT 
    m.id as mentor_id,
    m.user_id,
    u.first_name,
    u.username,
    m.status,
    m.total_points,
    m.created_at as mentor_since,
    ms.subscription_type,
    ms.is_lifetime,
    ms.free_access_earned,
    ms.expires_at,
    COUNT(DISTINCT mm.mentee_id) as total_mentees,
    COUNT(DISTINCT CASE WHEN mm.status = 'active' THEN mm.mentee_id END) as active_mentees,
    COUNT(DISTINCT CASE WHEN ma.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN ma.id END) as monthly_activities,
    COUNT(DISTINCT CASE WHEN ma.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN ma.id END) as weekly_activities,
    COUNT(DISTINCT ma.id) as total_activities,
    AVG(mr.rating) as average_rating,
    COUNT(DISTINCT mr.id) as total_reviews,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - m.created_at))/86400 as mentor_days
FROM mentors m
JOIN users u ON m.user_id = u.id
LEFT JOIN mentor_subscriptions ms ON m.id = ms.mentor_id
LEFT JOIN mentor_mentees mm ON m.id = mm.mentor_id
LEFT JOIN mentor_activities ma ON m.id = ma.mentor_id
LEFT JOIN mentor_reviews mr ON m.id = mr.mentor_id
GROUP BY m.id, m.user_id, u.first_name, u.username, m.status, m.total_points, 
         m.created_at, ms.subscription_type, ms.is_lifetime, ms.free_access_earned, ms.expires_at;