-- ============================================
-- RUHIZ - Complete Supabase Setup Script
-- ============================================
-- Run this in your Supabase SQL Editor:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project (RUHIZ)
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Paste this entire file
-- 6. Click "Run" or press Ctrl+Enter
-- ============================================

-- ============================================
-- DIRECT MESSAGING TABLES
-- ============================================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id TEXT NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- ============================================
-- GROUP MESSAGING TABLES
-- ============================================

-- Group conversations (projects, study groups, startups)
CREATE TABLE IF NOT EXISTS group_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PROJECT', 'STUDY_GROUP', 'STARTUP')),
  entity_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group participants
CREATE TABLE IF NOT EXISTS group_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  can_share_media BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Group messages
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'PDF', 'LOCATION')),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group message reactions
CREATE TABLE IF NOT EXISTS group_message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Direct messaging indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conv ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(conversation_id, sender_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON message_reactions(message_id);

-- Group messaging indexes
CREATE INDEX IF NOT EXISTS idx_group_participants_user ON group_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_group_participants_conv ON group_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_conv ON group_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_group_conversations_entity ON group_conversations(entity_id, type);

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Skip if tables are already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_participants;
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reactions ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see conversations they're part of
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their conversations" ON conversations
  FOR UPDATE USING (
    id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()::text
    )
  );

-- Conversation participants: Users can see participants in their conversations
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can add participants" ON conversation_participants
  FOR INSERT WITH CHECK (true);

-- Direct messages: Users can see messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON direct_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON direct_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()::text AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their own messages" ON direct_messages
  FOR UPDATE USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()::text
    )
  );

-- Message reactions: Users can see reactions in their conversations
CREATE POLICY "Users can view reactions in their conversations" ON message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM direct_messages WHERE conversation_id IN (
        SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text AND
    message_id IN (
      SELECT id FROM direct_messages WHERE conversation_id IN (
        SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can delete their own reactions" ON message_reactions
  FOR DELETE USING (user_id = auth.uid()::text);

-- Group conversations: Users can see groups they're part of
CREATE POLICY "Users can view their group conversations" ON group_conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM group_participants WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create group conversations" ON group_conversations
  FOR INSERT WITH CHECK (created_by = auth.uid()::text);

-- Group participants: Users can see participants in their groups
CREATE POLICY "Users can view participants in their groups" ON group_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM group_participants WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can add participants" ON group_participants
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT conversation_id FROM group_participants 
      WHERE user_id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Group messages: Users can see messages in their groups
CREATE POLICY "Users can view messages in their groups" ON group_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM group_participants WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can send messages to their groups" ON group_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()::text AND
    conversation_id IN (
      SELECT conversation_id FROM group_participants WHERE user_id = auth.uid()::text
    )
  );

-- Group message reactions: Users can see reactions in their groups
CREATE POLICY "Users can view reactions in their groups" ON group_message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM group_messages WHERE conversation_id IN (
        SELECT conversation_id FROM group_participants WHERE user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can add group reactions" ON group_message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text AND
    message_id IN (
      SELECT id FROM group_messages WHERE conversation_id IN (
        SELECT conversation_id FROM group_participants WHERE user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can delete their own group reactions" ON group_message_reactions
  FOR DELETE USING (user_id = auth.uid()::text);

-- ============================================
-- DONE!
-- ============================================
-- Your Supabase database is now ready for RUHIZ messaging features!
