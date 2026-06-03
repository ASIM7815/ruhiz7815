-- Ruhiz profile identity and social graph

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS cover_image TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS college_verified BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS followers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT followers_no_self_follow CHECK (follower_id <> following_id),
  CONSTRAINT followers_follower_id_following_id_key UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);

CREATE TABLE IF NOT EXISTS endorsements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  giver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT endorsements_no_self_endorsement CHECK (receiver_id <> giver_id),
  CONSTRAINT endorsements_receiver_id_giver_id_label_key UNIQUE (receiver_id, giver_id, label)
);

CREATE INDEX IF NOT EXISTS idx_endorsements_receiver_id ON endorsements(receiver_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_giver_id ON endorsements(giver_id);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  href TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id_created_at ON activities(user_id, created_at DESC);
