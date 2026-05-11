-- RUHIZ WebRTC call sessions and private Realtime signaling policies.
-- Run this in the Supabase SQL Editor before enabling production calls.

CREATE TABLE IF NOT EXISTS call_sessions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id TEXT NOT NULL,
  callee_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (
    status IN (
      'ringing',
      'accepted',
      'busy',
      'cancelled',
      'ended',
      'failed',
      'missed',
      'rejected'
    )
  ),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  accepted_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_by TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation
  ON call_sessions(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller
  ON call_sessions(caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee
  ON call_sessions(callee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_active
  ON call_sessions(status, expires_at)
  WHERE status IN ('ringing', 'accepted');

ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Call participants can view sessions" ON call_sessions;
CREATE POLICY "Call participants can view sessions" ON call_sessions
  FOR SELECT TO authenticated
  USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);

-- Next.js API routes use the service role for writes. This policy is useful for
-- future client-side status reads and for private Realtime authorization checks.
DROP POLICY IF EXISTS "Call participants can update own sessions" ON call_sessions;
CREATE POLICY "Call participants can update own sessions" ON call_sessions
  FOR UPDATE TO authenticated
  USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);

-- Private Supabase Realtime Broadcast authorization.
-- The browser uses:
--   calls:user:<user_id> for call invites/cancels
--   call:<call_id> for SDP, ICE, accept/reject/end
DROP POLICY IF EXISTS "Call participants can receive signaling" ON realtime.messages;
CREATE POLICY "Call participants can receive signaling" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'calls:user:' || auth.uid()::text
    OR (
      realtime.topic() LIKE 'call:%'
      AND EXISTS (
        SELECT 1 FROM call_sessions
        WHERE id = split_part(realtime.topic(), ':', 2)
          AND (caller_id = auth.uid()::text OR callee_id = auth.uid()::text)
      )
    )
  );

DROP POLICY IF EXISTS "Call participants can send signaling" ON realtime.messages;
CREATE POLICY "Call participants can send signaling" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      realtime.topic() = 'calls:user:' || auth.uid()::text
    )
    OR (
      realtime.topic() LIKE 'calls:user:%'
      AND EXISTS (
        SELECT 1 FROM call_sessions
        WHERE caller_id = auth.uid()::text
          AND callee_id = split_part(realtime.topic(), ':', 3)
          AND status = 'ringing'
          AND expires_at > now()
      )
    )
    OR (
      realtime.topic() LIKE 'call:%'
      AND EXISTS (
        SELECT 1 FROM call_sessions
        WHERE id = split_part(realtime.topic(), ':', 2)
          AND (caller_id = auth.uid()::text OR callee_id = auth.uid()::text)
      )
    )
  );
