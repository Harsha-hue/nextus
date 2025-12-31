-- Nextus Database Schema for Supabase PostgreSQL
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'UTC',
  status VARCHAR(50) DEFAULT 'offline',
  custom_status TEXT,
  custom_status_emoji VARCHAR(50),
  status_expiry TIMESTAMP,
  bio TEXT,
  title VARCHAR(100),
  pronouns VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expiry TIMESTAMP,
  magic_code VARCHAR(6),
  magic_code_expiry TIMESTAMP,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- WORKSPACES TABLE
-- ============================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  domain VARCHAR(255),
  avatar_url TEXT,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  plan_type VARCHAR(50) DEFAULT 'free',
  storage_quota_gb INTEGER DEFAULT 5,
  storage_used_gb DECIMAL(10,2) DEFAULT 0,
  member_limit INTEGER DEFAULT 10,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- WORKSPACE MEMBERS TABLE
-- ============================================
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  title VARCHAR(100),
  joined_at TIMESTAMP DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(workspace_id, user_id)
);

-- ============================================
-- CHANNELS TABLE
-- ============================================
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  description TEXT,
  topic TEXT,
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  parent_channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- ============================================
-- CHANNEL MEMBERS TABLE
-- ============================================
CREATE TABLE channel_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  notification_level VARCHAR(50) DEFAULT 'all',
  is_muted BOOLEAN DEFAULT false,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- ============================================
-- DIRECT MESSAGE GROUPS TABLE
-- ============================================
CREATE TABLE dm_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT false,
  name VARCHAR(100),
  creator_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DM GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE dm_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dm_group_id UUID REFERENCES dm_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP DEFAULT NOW(),
  notification_level VARCHAR(50) DEFAULT 'all',
  UNIQUE(dm_group_id, user_id)
);

-- ============================================
-- FILES TABLE (Metadata only)
-- ============================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  dm_group_id UUID REFERENCES dm_groups(id) ON DELETE SET NULL,
  uploader_id UUID REFERENCES users(id),
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  storage_provider VARCHAR(50) DEFAULT 'google_drive',
  google_drive_id VARCHAR(255),
  google_drive_url TEXT,
  supabase_path TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(50) DEFAULT 'medium',
  assignee_id UUID REFERENCES users(id),
  creator_id UUID REFERENCES users(id),
  due_date TIMESTAMP,
  labels TEXT[],
  position INTEGER,
  parent_task_id UUID REFERENCES tasks(id),
  time_estimate_minutes INTEGER,
  time_spent_minutes INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- ============================================
-- INTEGRATIONS TABLE
-- ============================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- WEBHOOKS TABLE
-- ============================================
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50),
  url TEXT,
  token VARCHAR(255) UNIQUE,
  secret VARCHAR(255),
  events TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  last_triggered_at TIMESTAMP,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  theme VARCHAR(50) DEFAULT 'light',
  accent_color VARCHAR(7) DEFAULT '#6B46C1',
  notification_settings JSONB DEFAULT '{}',
  sidebar_settings JSONB DEFAULT '{}',
  keyboard_shortcuts JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_channels_workspace ON channels(workspace_id);
CREATE INDEX idx_channel_members_user ON channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX idx_files_workspace ON files(workspace_id);
CREATE INDEX idx_files_channel ON files(channel_id);
CREATE INDEX idx_tasks_channel ON tasks(channel_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users: Users can read any profile, but only update their own
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Workspaces: Users can only see workspaces they're members of
CREATE POLICY "Users can view member workspaces" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id::text = auth.uid()::text
      AND workspace_members.is_active = true
    )
  );

-- Workspace Members: Users can view members of their workspaces
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id::text = auth.uid()::text
      AND wm.is_active = true
    )
  );

-- Channels: Users can view channels in their workspaces
CREATE POLICY "Users can view workspace channels" ON channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = channels.workspace_id
      AND wm.user_id::text = auth.uid()::text
      AND wm.is_active = true
    )
    AND (
      channels.is_private = false
      OR EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = channels.id
        AND cm.user_id::text = auth.uid()::text
      )
    )
  );

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id::text = auth.uid()::text);

-- User Preferences: Users can only manage their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR ALL USING (user_id::text = auth.uid()::text);
