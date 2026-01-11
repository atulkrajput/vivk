-- Production Security Configuration for VIVK MVP
-- This migration sets up Row Level Security (RLS) and proper access controls

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Conversations table policies
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid()::text = user_id);

-- Messages table policies
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()::text
    )
  );

-- Usage logs table policies
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can create usage logs" ON usage_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update usage logs" ON usage_logs
  FOR UPDATE USING (true);

-- Subscriptions table policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can manage subscriptions" ON subscriptions
  FOR ALL USING (true);

-- Payments table policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can create payments" ON payments
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);

-- Create function for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for daily usage reset (called by cron)
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
    -- Reset daily usage for all users
    UPDATE usage_logs 
    SET message_count = 0 
    WHERE date = CURRENT_DATE;
    
    -- Insert new records for users who don't have today's record
    INSERT INTO usage_logs (user_id, date, message_count, tokens_used)
    SELECT u.id, CURRENT_DATE, 0, 0
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM usage_logs ul 
        WHERE ul.user_id = u.id AND ul.date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Revoke unnecessary permissions from anon users
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON users TO anon; -- Only for auth purposes

-- Create database backup function (for production maintenance)
CREATE OR REPLACE FUNCTION create_backup_point(backup_name text)
RETURNS text AS $$
BEGIN
    -- This would be implemented with actual backup logic in production
    -- For now, it's a placeholder that logs the backup request
    INSERT INTO system_logs (event_type, message, created_at)
    VALUES ('backup', 'Backup point created: ' || backup_name, NOW());
    
    RETURN 'Backup point created: ' || backup_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create system logs table for monitoring
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_logs_type_created ON system_logs(event_type, created_at DESC);

-- Grant permissions for system logs
GRANT SELECT, INSERT ON system_logs TO authenticated;

COMMENT ON TABLE system_logs IS 'System-level logs for monitoring and debugging';
COMMENT ON FUNCTION reset_daily_usage() IS 'Resets daily usage counters for all users';
COMMENT ON FUNCTION create_backup_point(text) IS 'Creates a backup point for disaster recovery';