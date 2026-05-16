# Quick Fix for Production HTTP 500 Errors

## The Problem
Your deployed website shows HTTP 500 errors because Supabase database is missing tables.

## The Solution (5 Minutes)

### 1. Open Supabase
Go to: https://supabase.com/dashboard

### 2. Select Your Project
Click on your project (database: `ybmauetbeakurugikmpb`)

### 3. Open SQL Editor
- Click "SQL Editor" in left sidebar
- Click "New query"

### 4. Paste This SQL

**Copy this entire SQL and paste it in Supabase SQL Editor:**

```sql
-- Create reports table
CREATE TABLE IF NOT EXISTS "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create file_assets table
CREATE TABLE IF NOT EXISTS "file_assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "reports_status_created_at_idx" ON "reports"("status", "created_at");
CREATE INDEX IF NOT EXISTS "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "file_assets_user_id_created_at_idx" ON "file_assets"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "file_assets_entity_type_entity_id_idx" ON "file_assets"("entity_type", "entity_id");

-- Add foreign keys (safe - checks if exists first)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_reporter_id_fkey') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" 
        FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_id_fkey') THEN
        ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" 
        FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_assets_user_id_fkey') THEN
        ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
```

### 5. Click "Run"
Press the Run button or Ctrl+Enter

### 6. Verify
- Go to "Table Editor" in Supabase
- Check that `reports`, `audit_logs`, `file_assets` tables exist

### 7. Test Website
- Refresh your deployed website
- Try creating a project
- HTTP 500 errors should be gone!

## Done!
Your website should now work without errors! 🎉

---

**Time needed**: 5 minutes
**Difficulty**: Easy
**Result**: Website fixed
