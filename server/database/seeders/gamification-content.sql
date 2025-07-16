-- Gamification Content Seeder
-- Motivational and challenge system for recovery support

-- Insert sample daily challenges
INSERT INTO daily_challenges (title, description, challenge_type, difficulty_level, points_reward, instructions) VALUES
-- Mindfulness challenges
('Morning Meditation', 'Start your day with 10 minutes of mindful meditation', 'mindfulness', 1, 15, '["Find a quiet space", "Sit comfortably", "Focus on your breath for 10 minutes", "Notice thoughts without judgment"]'),
('Gratitude Practice', 'Write down 3 things you''re grateful for today', 'mindfulness', 1, 10, '["Find a journal or notepad", "Think about your day", "Write 3 specific things you''re grateful for", "Reflect on why each matters to you"]'),
('Body Scan Relaxation', 'Practice a full-body relaxation technique', 'mindfulness', 2, 20, '["Lie down comfortably", "Start from your toes", "Gradually relax each body part", "End with deep breathing"]'),
('Mindful Walking', 'Take a 15-minute mindful walk in nature', 'mindfulness', 2, 25, '["Choose a peaceful outdoor location", "Walk slowly and deliberately", "Focus on each step", "Notice sounds, smells, and sights"]'),

-- Physical challenges
('Morning Stretch', 'Complete a 10-minute morning stretching routine', 'physical', 1, 15, '["Start with neck rolls", "Stretch arms and shoulders", "Do gentle back bends", "End with leg stretches"]'),
('Hydration Goal', 'Drink 8 glasses of water throughout the day', 'physical', 1, 10, '["Set hourly reminders", "Use a water bottle with measurements", "Track your intake", "Spread consumption evenly"]'),
('Cardio Boost', 'Do 20 minutes of cardio exercise', 'physical', 3, 30, '["Choose your favorite cardio activity", "Warm up for 5 minutes", "Maintain steady pace for 15 minutes", "Cool down properly"]'),
('Strength Training', 'Complete a basic strength training workout', 'physical', 4, 40, '["Do bodyweight exercises", "Include push-ups, squats, planks", "Rest between sets", "Focus on proper form"]'),

-- Social challenges
('Connect with Family', 'Have a meaningful conversation with a family member', 'social', 2, 20, '["Choose someone you care about", "Ask open-ended questions", "Listen actively", "Share something personal"]'),
('Help Someone', 'Do something kind for another person today', 'social', 1, 15, '["Look for opportunities to help", "Offer assistance without being asked", "Be genuine in your kindness", "Reflect on how it made you feel"]'),
('Community Engagement', 'Participate in a community activity or group', 'social', 3, 35, '["Find a local group or activity", "Attend an event or meeting", "Introduce yourself to new people", "Contribute to the discussion"]'),

-- Learning challenges
('Read for Growth', 'Read for 30 minutes about personal development', 'learning', 2, 20, '["Choose a self-help or recovery book", "Find a quiet reading space", "Take notes on key insights", "Reflect on how to apply what you learned"]'),
('Learn Something New', 'Spend 45 minutes learning a new skill', 'learning', 3, 30, '["Choose a skill you''re interested in", "Use online tutorials or courses", "Practice actively", "Set a goal for tomorrow"]'),
('Recovery Education', 'Watch an educational video about addiction and recovery', 'learning', 2, 25, '["Find a reputable source", "Take notes during the video", "Identify one new insight", "Share what you learned with someone"]'),

-- Creativity challenges
('Creative Expression', 'Spend 30 minutes on a creative activity', 'creativity', 2, 25, '["Choose art, music, writing, or crafts", "Focus on the process, not perfection", "Let your emotions guide you", "Reflect on what you created"]'),
('Journal Reflection', 'Write a detailed journal entry about your recovery journey', 'creativity', 2, 20, '["Find a quiet space", "Write for at least 15 minutes", "Be honest about your feelings", "Include your hopes for the future"]'),
('Photo Story', 'Take photos that tell the story of your positive day', 'creativity', 1, 15, '["Take 5-10 meaningful photos", "Focus on positive moments", "Write captions for each", "Create a small photo story"]');

-- Insert motivational quotes and content
INSERT INTO motivational_content (content_type, title, content, author, category, addiction_types) VALUES
-- Recovery quotes
('quote', 'One Day at a Time', 'Recovery is about taking it one day at a time. Each day clean is a victory worth celebrating.', 'AA Wisdom', 'recovery', '["substance_abuse", "alcohol", "drugs"]'),
('quote', 'Strength in Struggle', 'The strongest people are not those who show strength in front of us, but those who win battles we know nothing about.', 'Unknown', 'motivation', '[]'),
('quote', 'New Beginnings', 'Every moment is a fresh beginning. You have the power to change your story starting right now.', 'T.S. Eliot', 'motivation', '[]'),
('quote', 'Progress Over Perfection', 'Progress, not perfection. Every step forward matters, no matter how small.', 'Recovery Wisdom', 'recovery', '[]'),
('quote', 'Inner Strength', 'You are braver than you believe, stronger than you seem, and smarter than you think.', 'A.A. Milne', 'self_worth', '[]'),

-- Porn addiction specific quotes for recovery support
('quote', 'Breaking Free', 'Every urge you resist makes you stronger. Your brain is rewiring itself with each moment of resistance.', 'Recovery Wisdom', 'recovery', '["pornography", "sex_addiction"]'),
('quote', 'Real Connections', 'True intimacy comes from real human connection, not from screens. You''re choosing the real over the artificial.', 'Recovery Expert', 'relationships', '["pornography", "sex_addiction"]'),
('quote', 'Neuroplasticity', 'Your brain has an amazing ability to heal and rewire. Every day clean is literally changing your neural pathways.', 'Neuroscience', 'brain_health', '["pornography", "sex_addiction"]'),

-- General addiction recovery
('quote', 'Daily Choice', 'Recovery is a daily choice. Choose yourself. Choose your future. Choose freedom.', 'Recovery Coach', 'daily_motivation', '[]'),
('quote', 'Small Steps', 'A journey of a thousand miles begins with a single step. Your recovery journey starts with today.', 'Lao Tzu', 'motivation', '[]'),

-- Tips and facts
('tip', 'Trigger Management', 'When you feel a craving, try the HALT technique: Are you Hungry, Angry, Lonely, or Tired? Address the root need.', 'Recovery Strategy', 'coping_skills', '[]'),
('tip', 'Dopamine Reset', 'After 90 days clean, your dopamine receptors begin to normalize. The reboot is real and scientifically proven.', 'Neuroscience', 'brain_health', '["pornography", "sex_addiction"]'),
('tip', 'Community Support', 'Connecting with others in recovery increases your chances of success by 80%. You don''t have to do this alone.', 'Recovery Research', 'community', '[]'),
('tip', 'Mindfulness Practice', 'Just 10 minutes of daily meditation can reduce cravings by up to 60%. Your mind is your most powerful tool.', 'Meditation Research', 'mindfulness', '[]'),

('fact', 'Brain Healing', 'Within just 30 days of recovery, your brain begins significant healing. New neural pathways start forming immediately.', 'Neuroscience', 'brain_health', '[]'),
('fact', 'Sleep Improvement', 'Most people in recovery report significantly better sleep quality after just 2 weeks. Your body is healing.', 'Sleep Research', 'health', '[]'),
('fact', 'Mood Enhancement', 'Studies show that mood stability improves dramatically after the first month of recovery.', 'Psychology Research', 'mental_health', '[]'),

-- Affirmations
('affirmation', 'Daily Strength', 'I am strong enough to overcome any challenge. Each day, I choose my recovery and my future.', 'Recovery Affirmation', 'self_worth', '[]'),
('affirmation', 'Progress Celebration', 'I celebrate every victory, no matter how small. Each moment of resistance makes me stronger.', 'Recovery Affirmation', 'self_worth', '[]'),
('affirmation', 'Future Focus', 'I am building the life I want. My recovery is an investment in my future happiness and freedom.', 'Recovery Affirmation', 'motivation', '[]'),
('affirmation', 'Self-Compassion', 'I treat myself with kindness and understanding. Recovery is a journey, and I am patient with myself.', 'Recovery Affirmation', 'self_care', '[]'),
('affirmation', 'Inner Peace', 'I am finding peace within myself. Each day of recovery brings me closer to the person I want to become.', 'Recovery Affirmation', 'inner_peace', '[]');

-- Insert sample addiction types with icons and colors for visual design
INSERT INTO addiction_types (name, description, icon, color) VALUES
('Pornography', 'Overcome pornography addiction and reclaim healthy sexuality', '🔒', '#E53E3E'),
('Social Media', 'Break free from compulsive social media use and digital overwhelm', '📱', '#3182CE'),
('Gaming', 'Balance gaming habits and develop real-world connections', '🎮', '#9F7AEA'),
('Alcohol', 'Achieve sobriety and build a fulfilling alcohol-free life', '🚫', '#D69E2E'),
('Drugs', 'Overcome substance addiction and embrace clean living', '💊', '#38A169'),
('Nicotine', 'Quit smoking/vaping and improve your health', '🚭', '#DD6B20'),
('Gambling', 'Break the cycle of gambling addiction and financial stress', '🎰', '#E53E3E'),
('Shopping', 'Control compulsive spending and build financial wellness', '🛍️', '#805AD5'),
('Food', 'Develop a healthy relationship with food and eating', '🍎', '#48BB78'),
('Work', 'Create work-life balance and overcome workaholism', '💼', '#4299E1'),
('Sex', 'Build healthy relationships and overcome sex addiction', '💕', '#ED64A6'),
('Sugar', 'Reduce sugar dependency and improve overall health', '🍬', '#F6AD55') ON CONFLICT (name) DO NOTHING;

-- Insert sample trigger types for calendar tracking
INSERT INTO trigger_logs (user_id, trigger_date, trigger_type, intensity_level, situation_description, coping_strategy_used, outcome, notes, location_context, time_of_day) VALUES
-- Example entries showing common trigger patterns for demonstration
('00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 day', 'Stress', 7, 'Work deadline approaching', 'Deep breathing and meditation', 'avoided', 'Successfully redirected energy into positive activities', 'work', '14:30:00'),
('00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '2 days', 'Boredom', 5, 'Weekend evening with nothing planned', 'Called a friend for support', 'avoided', 'Social connection helped break the cycle', 'home', '19:15:00'),
('00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '3 days', 'Social Pressure', 8, 'Friends asking to engage in old habits', 'Politely declined and suggested alternative activity', 'avoided', 'Proud of standing firm on boundaries', 'social_event', '21:00:00'),
('00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '5 days', 'Emotional', 6, 'Feeling lonely and disconnected', 'Used RecovR community support feature', 'redirected', 'Found encouragement from others in recovery', 'home', '22:45:00'),
('00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '7 days', 'Routine Disruption', 4, 'Travel schedule threw off normal routine', 'Maintained morning meditation despite travel', 'avoided', 'Flexibility in maintaining core habits was key', 'travel', '08:00:00') 
ON CONFLICT DO NOTHING;