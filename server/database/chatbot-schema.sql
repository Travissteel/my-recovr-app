-- AI Chatbot Database Schema
-- This schema will be integrated when the AI chatbot feature is enabled

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  sentiment_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(100) NOT NULL REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'crisis_response', 'resource_link', 'suggestion')),
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative', 'crisis')),
  is_crisis_detected BOOLEAN DEFAULT FALSE,
  ai_model_version VARCHAR(50),
  response_time_ms INTEGER,
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure user can only have messages in their own conversations
  CONSTRAINT fk_message_user_conversation 
    FOREIGN KEY (user_id, conversation_id) 
    REFERENCES chat_conversations(user_id, conversation_id)
);

-- AI training feedback table
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'inappropriate', 'crisis_missed')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crisis intervention logs
CREATE TABLE IF NOT EXISTS crisis_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  crisis_level VARCHAR(20) NOT NULL CHECK (crisis_level IN ('low', 'medium', 'high', 'critical')),
  keywords_detected TEXT[],
  intervention_type VARCHAR(30) NOT NULL CHECK (intervention_type IN ('ai_response', 'human_escalation', 'emergency_contact')),
  resolution_status VARCHAR(20) DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'escalated')),
  follow_up_required BOOLEAN DEFAULT TRUE,
  follow_up_completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- AI model configurations
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL UNIQUE,
  model_version VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'custom', etc.
  api_endpoint TEXT,
  max_tokens INTEGER DEFAULT 1000,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  system_prompt TEXT NOT NULL,
  crisis_detection_enabled BOOLEAN DEFAULT TRUE,
  crisis_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  response_guidelines JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat analytics and metrics
CREATE TABLE IF NOT EXISTS chat_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_response_time_ms DECIMAL(8,2),
  sentiment_breakdown JSONB DEFAULT '{}', -- {"positive": 10, "neutral": 5, "negative": 2, "crisis": 1}
  crisis_interventions INTEGER DEFAULT 0,
  user_satisfaction_avg DECIMAL(3,2),
  most_common_topics TEXT[],
  peak_usage_hours INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sentiment ON chat_messages(sentiment);
CREATE INDEX IF NOT EXISTS idx_chat_messages_crisis ON chat_messages(is_crisis_detected) WHERE is_crisis_detected = TRUE;
CREATE INDEX IF NOT EXISTS idx_crisis_interventions_user_id ON crisis_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_interventions_created_at ON crisis_interventions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crisis_interventions_status ON crisis_interventions(resolution_status);

-- Functions and triggers for maintaining data integrity

-- Function to update conversation metadata
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chat_conversations 
    SET 
      message_count = message_count + 1,
      last_message_at = NEW.created_at,
      updated_at = CURRENT_TIMESTAMP
    WHERE conversation_id = NEW.conversation_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chat_conversations 
    SET 
      message_count = GREATEST(message_count - 1, 0),
      updated_at = CURRENT_TIMESTAMP
    WHERE conversation_id = OLD.conversation_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update conversation metadata
DROP TRIGGER IF EXISTS trigger_update_conversation_metadata ON chat_messages;
CREATE TRIGGER trigger_update_conversation_metadata
  AFTER INSERT OR DELETE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_metadata();

-- Function to automatically log crisis interventions
CREATE OR REPLACE FUNCTION log_crisis_intervention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_crisis_detected = TRUE AND (OLD IS NULL OR OLD.is_crisis_detected = FALSE) THEN
    INSERT INTO crisis_interventions (
      user_id,
      message_id,
      crisis_level,
      intervention_type,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      CASE 
        WHEN NEW.sentiment = 'crisis' THEN 'high'
        ELSE 'medium'
      END,
      'ai_response',
      'Crisis detected by AI model: ' || COALESCE(NEW.ai_model_version, 'unknown')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for crisis intervention logging
DROP TRIGGER IF EXISTS trigger_log_crisis_intervention ON chat_messages;
CREATE TRIGGER trigger_log_crisis_intervention
  AFTER INSERT OR UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION log_crisis_intervention();

-- Insert default AI model configuration (placeholder)
INSERT INTO ai_model_configs (
  model_name,
  model_version,
  provider,
  max_tokens,
  temperature,
  system_prompt,
  crisis_detection_enabled,
  crisis_keywords,
  response_guidelines,
  is_active
) VALUES (
  'recovr-companion-v1',
  '1.0.0',
  'custom',
  1000,
  0.7,
  'You are a compassionate AI recovery companion for RecovR, a multi-addiction recovery platform. Your role is to provide supportive, evidence-based guidance to individuals in recovery from various addictions including pornography, social media, alcohol, drugs, food, and behavioral addictions. 

Guidelines:
- Always be empathetic, non-judgmental, and encouraging
- Use evidence-based recovery principles (CBT, DBT, motivational interviewing)
- Recognize crisis situations and escalate appropriately
- Encourage professional help when needed
- Maintain hope and focus on progress, not perfection
- Respect user privacy and confidentiality
- Avoid giving medical advice
- Celebrate small wins and milestones

If you detect any crisis indicators (suicide ideation, self-harm, overdose risk), immediately provide crisis resources and encourage professional help.',
  TRUE,
  ARRAY['suicide', 'kill myself', 'end it all', 'self harm', 'hurt myself', 'want to die', 'no point living', 'hopeless', 'overdose', 'cant take it anymore'],
  '{
    "max_conversation_length": 50,
    "response_style": "supportive",
    "crisis_escalation": "immediate",
    "resource_suggestions": true,
    "follow_up_reminders": true
  }'::jsonb,
  FALSE
) ON CONFLICT (model_name) DO NOTHING;

-- Create view for conversation summaries
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
  cc.id,
  cc.user_id,
  cc.conversation_id,
  cc.title,
  cc.status,
  cc.last_message_at,
  cc.message_count,
  cc.created_at,
  cm_last.content as last_message_preview,
  cm_last.sender as last_message_sender,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM chat_messages cm2 
      WHERE cm2.conversation_id = cc.conversation_id 
      AND cm2.is_crisis_detected = TRUE
    ) THEN TRUE 
    ELSE FALSE 
  END as has_crisis_messages,
  COALESCE(
    (SELECT AVG(cf.rating) FROM chat_feedback cf 
     JOIN chat_messages cm3 ON cf.message_id = cm3.id 
     WHERE cm3.conversation_id = cc.conversation_id),
    0
  ) as avg_rating
FROM chat_conversations cc
LEFT JOIN LATERAL (
  SELECT content, sender, created_at
  FROM chat_messages cm
  WHERE cm.conversation_id = cc.conversation_id
  ORDER BY created_at DESC
  LIMIT 1
) cm_last ON TRUE
WHERE cc.status != 'deleted';

-- Grant permissions (adjust as needed for your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO recovr_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO recovr_app_user;