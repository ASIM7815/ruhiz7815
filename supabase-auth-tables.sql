-- ============================================
-- RUHIZ - User Authentication & Profile Tables
-- ============================================
-- Run this in your Supabase SQL Editor to add user storage
-- This will store all user data, accounts, and sessions
-- ============================================

-- ============================================
-- USER TABLES
-- ============================================

-- Main users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  uid TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  password TEXT,
  image TEXT,
  bio TEXT,
  university TEXT,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  reputation INTEGER NOT NULL DEFAULT 0,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAuth accounts table (Google, etc.)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

-- Verification tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, token)
);

-- User skills
CREATE TABLE IF NOT EXISTS user_skills (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  UNIQUE(user_id, skill)
);

-- User interests
CREATE TABLE IF NOT EXISTS user_interests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  UNIQUE(user_id, interest)
);

-- ============================================
-- PROJECTS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  timeline TEXT,
  max_members INTEGER NOT NULL DEFAULT 4,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_skills (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  UNIQUE(project_id, skill)
);

CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS join_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ============================================
-- STUDY GROUPS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS study_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  max_members INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_group_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_group_join_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- ============================================
-- STARTUPS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS startups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'IDEA',
  looking_for TEXT,
  founder_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS startup_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  startup_id TEXT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(startup_id, user_id)
);

CREATE TABLE IF NOT EXISTS startup_join_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  startup_id TEXT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(startup_id, user_id)
);

-- ============================================
-- MARKETPLACE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  condition TEXT,
  image_url TEXT,
  seller_id TEXT NOT NULL REFERENCES users(id),
  sold BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- KNOWLEDGE HUB TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  file_url TEXT,
  university TEXT,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);

-- Study group indexes
CREATE INDEX IF NOT EXISTS idx_study_group_members_user ON study_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_group ON study_group_members(group_id);

-- Startup indexes
CREATE INDEX IF NOT EXISTS idx_startups_founder ON startups(founder_id);
CREATE INDEX IF NOT EXISTS idx_startup_members_user ON startup_members(user_id);

-- Marketplace indexes
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);

-- Resource indexes
CREATE INDEX IF NOT EXISTS idx_resources_author ON resources(author_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: Everyone can view profiles, users can update their own
CREATE POLICY "Anyone can view user profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid()::text);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (true);

-- Accounts: Users can only see their own accounts
CREATE POLICY "Users can view their own accounts" ON accounts
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own accounts" ON accounts
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Sessions: Users can only see their own sessions
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own sessions" ON sessions
  FOR DELETE USING (user_id = auth.uid()::text);

-- Verification tokens: Allow all operations (needed for auth flow)
CREATE POLICY "Anyone can manage verification tokens" ON verification_tokens
  FOR ALL USING (true);

-- User skills: Users can manage their own skills
CREATE POLICY "Anyone can view user skills" ON user_skills
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own skills" ON user_skills
  FOR ALL USING (user_id = auth.uid()::text);

-- User interests: Users can manage their own interests
CREATE POLICY "Anyone can view user interests" ON user_interests
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own interests" ON user_interests
  FOR ALL USING (user_id = auth.uid()::text);

-- Projects: Everyone can view, authenticated users can create
CREATE POLICY "Anyone can view projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

CREATE POLICY "Project owners can update their projects" ON projects
  FOR UPDATE USING (owner_id = auth.uid()::text);

CREATE POLICY "Project owners can delete their projects" ON projects
  FOR DELETE USING (owner_id = auth.uid()::text);

-- Project skills: Follow project permissions
CREATE POLICY "Anyone can view project skills" ON project_skills
  FOR SELECT USING (true);

CREATE POLICY "Project owners can manage skills" ON project_skills
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()::text)
  );

-- Project members: Everyone can view, members can be added by owners
CREATE POLICY "Anyone can view project members" ON project_members
  FOR SELECT USING (true);

CREATE POLICY "Project owners can manage members" ON project_members
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()::text)
  );

-- Join requests: Users can create, owners can manage
CREATE POLICY "Users can view their own join requests" ON join_requests
  FOR SELECT USING (user_id = auth.uid()::text OR project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()::text
  ));

CREATE POLICY "Users can create join requests" ON join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Project owners can update join requests" ON join_requests
  FOR UPDATE USING (project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()::text
  ));

-- Study groups: Everyone can view, authenticated users can create
CREATE POLICY "Anyone can view study groups" ON study_groups
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create study groups" ON study_groups
  FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

-- Study group members: Everyone can view
CREATE POLICY "Anyone can view study group members" ON study_group_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join study groups" ON study_group_members
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Startups: Everyone can view, authenticated users can create
CREATE POLICY "Anyone can view startups" ON startups
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create startups" ON startups
  FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

CREATE POLICY "Founders can update their startups" ON startups
  FOR UPDATE USING (founder_id = auth.uid()::text);

-- Listings: Everyone can view, authenticated users can create
CREATE POLICY "Anyone can view listings" ON listings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create listings" ON listings
  FOR INSERT WITH CHECK (seller_id = auth.uid()::text);

CREATE POLICY "Sellers can update their listings" ON listings
  FOR UPDATE USING (seller_id = auth.uid()::text);

-- Resources: Everyone can view, authenticated users can create
CREATE POLICY "Anyone can view resources" ON resources
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create resources" ON resources
  FOR INSERT WITH CHECK (author_id = auth.uid()::text);

CREATE POLICY "Authors can update their resources" ON resources
  FOR UPDATE USING (author_id = auth.uid()::text);

-- Notifications: Users can only see their own
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

-- ============================================
-- FUNCTIONS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE!
-- ============================================
-- Your Supabase database now has all user, project, and platform tables!
-- The app will now store everything in Supabase instead of SQLite.
