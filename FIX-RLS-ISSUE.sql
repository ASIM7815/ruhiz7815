-- ============================================
-- FIX: Disable RLS on Prisma-Managed Tables
-- ============================================
-- This fixes the "RLS parsing error: invalid UTF8 character" issue
-- 
-- WHY: You're using Prisma with PostgreSQL adapter and the service role key
-- which bypasses RLS. Having RLS enabled causes parsing errors and prevents
-- queries from working correctly.
--
-- SAFE: This is safe because:
-- 1. Your API routes handle authentication with requireAuth()
-- 2. You're using the service role key (bypasses RLS anyway)
-- 3. RLS is only needed when using Supabase Auth directly from the client
-- ============================================

-- Disable RLS on all Prisma-managed tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE startups DISABLE ROW LEVEL SECURITY;
ALTER TABLE startup_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE startup_join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE file_assets DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies on Prisma tables
-- (These are not needed since we're using API-level authentication)
DROP POLICY IF EXISTS "Anyone can view user profiles" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can manage verification tokens" ON verification_tokens;
DROP POLICY IF EXISTS "Anyone can view user skills" ON user_skills;
DROP POLICY IF EXISTS "Users can manage their own skills" ON user_skills;
DROP POLICY IF EXISTS "Anyone can view user interests" ON user_interests;
DROP POLICY IF EXISTS "Users can manage their own interests" ON user_interests;
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;
DROP POLICY IF EXISTS "Anyone can view project skills" ON project_skills;
DROP POLICY IF EXISTS "Project owners can manage skills" ON project_skills;
DROP POLICY IF EXISTS "Anyone can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Users can view their own join requests" ON join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON join_requests;
DROP POLICY IF EXISTS "Project owners can update join requests" ON join_requests;
DROP POLICY IF EXISTS "Anyone can view study groups" ON study_groups;
DROP POLICY IF EXISTS "Authenticated users can create study groups" ON study_groups;
DROP POLICY IF EXISTS "Anyone can view study group members" ON study_group_members;

-- ============================================
-- KEEP RLS ENABLED ON SUPABASE-MANAGED TABLES
-- ============================================
-- These tables are managed by Supabase and need RLS:
-- - conversations
-- - conversation_participants
-- - direct_messages
-- - message_reactions
-- - group_conversations
-- - group_participants
-- - group_messages
-- - group_message_reactions
--
-- DO NOT disable RLS on these tables!
-- ============================================

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'projects', 'join_requests', 'project_members',
    'study_groups', 'startups', 'listings', 'notifications'
  )
ORDER BY tablename;

-- Expected output: All tables should have rls_enabled = false
