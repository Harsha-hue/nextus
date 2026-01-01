-- FCM Tokens Table for Push Notifications
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'android',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON user_fcm_tokens(token);

-- Enable RLS
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own FCM tokens"
    ON user_fcm_tokens
    FOR ALL
    USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "Service role can manage all FCM tokens"
    ON user_fcm_tokens
    FOR ALL
    USING (auth.role() = 'service_role');
