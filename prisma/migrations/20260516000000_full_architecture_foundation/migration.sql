-- Full architecture foundation fields for permissions, notifications, and lifecycle state.
-- Uses mapped table/column names from the current Prisma schema.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "platform_role" TEXT NOT NULL DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS "marketplace_role" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "marketplace_status" TEXT NOT NULL DEFAULT 'DISABLED';

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE "project_members"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "removed_at" TIMESTAMPTZ;

ALTER TABLE "join_requests"
  ADD COLUMN IF NOT EXISTS "reviewed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "link" TEXT,
  ADD COLUMN IF NOT EXISTS "actor_id" TEXT,
  ADD COLUMN IF NOT EXISTS "entity_type" TEXT,
  ADD COLUMN IF NOT EXISTS "entity_id" TEXT;

ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS "notifications_user_read_created_idx"
  ON "notifications" ("user_id", "read", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "join_requests_project_status_created_idx"
  ON "join_requests" ("project_id", "status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "project_members_user_status_idx"
  ON "project_members" ("user_id", "status");

CREATE INDEX IF NOT EXISTS "listings_status_category_created_idx"
  ON "listings" ("status", "category", "created_at" DESC);
