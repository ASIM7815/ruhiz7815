-- Enable Realtime for Real-Time Data Synchronization Feature
-- This migration enables Supabase Realtime for tables that need real-time updates

-- Enable Realtime for join requests (project and study group join requests)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'join_requests') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE join_requests;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

-- Enable Realtime for project members
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

-- Enable Realtime for study group members
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_group_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE study_group_members;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

-- Enable Realtime for projects (for project updates)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE projects;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

-- Enable Realtime for study groups (for study group updates)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_groups') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE study_groups;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

-- Enable Realtime for notifications
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

-- Enable Realtime for messages (project messages)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

-- Note: Row Level Security (RLS) policies must be properly configured
-- for each table to ensure users only receive real-time updates for
-- data they are authorized to access.

-- Verify RLS is enabled on all Realtime tables
DO $$
BEGIN
    -- Enable RLS on tables if not already enabled
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'join_requests') THEN
        ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_members') THEN
        ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_group_members') THEN
        ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_groups') THEN
        ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create indexes for better Realtime performance
-- These indexes help with filtering real-time events

-- Index for messages by project
CREATE INDEX IF NOT EXISTS idx_messages_project_created 
ON messages(project_id, created_at DESC) 
WHERE project_id IS NOT NULL;

-- Index for join requests by project
CREATE INDEX IF NOT EXISTS idx_join_requests_project 
ON join_requests(project_id, status, created_at DESC) 
WHERE project_id IS NOT NULL;

-- Index for project members by project
CREATE INDEX IF NOT EXISTS idx_project_members_project 
ON project_members(project_id, joined_at DESC);

-- Index for study group members by group
CREATE INDEX IF NOT EXISTS idx_study_group_members_group 
ON study_group_members(group_id, joined_at DESC);

-- Index for notifications by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, read, created_at DESC) 
WHERE read = false;

-- Add comments for documentation
COMMENT ON TABLE messages IS 'Realtime enabled for instant message delivery';
COMMENT ON TABLE join_requests IS 'Realtime enabled for instant join request notifications';
COMMENT ON TABLE project_members IS 'Realtime enabled for instant member list updates';
COMMENT ON TABLE study_group_members IS 'Realtime enabled for instant member list updates';
COMMENT ON TABLE projects IS 'Realtime enabled for instant project updates';
COMMENT ON TABLE study_groups IS 'Realtime enabled for instant study group updates';
COMMENT ON TABLE notifications IS 'Realtime enabled for instant notification delivery';
