# Apply SQL Migration to Supabase - Step by Step

## The Problem

Your production website is showing HTTP 500 errors because the Supabase database is missing the new tables (`reports`, `audit_logs`, `file_assets`).

## Solution: Apply SQL Directly in Supabase

### Step 1: Go to Supabase Dashboard

1. Open your browser
2. Go to: https://supabase.com/dashboard
3. Log in to your account
4. Select your project (the one with database: `ybmauetbeakurugikmpb`)

### Step 2: Open SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** button

### Step 3: Copy and Paste This SQL

Copy this entire SQL script and paste it into the SQL Editor:

```sql
-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "file_assets_user_id_created_at_idx" ON "file_assets"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "file_assets_entity_type_entity_id_idx" ON "file_assets"("entity_type", "entity_id");

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reports_reporter_id_fkey'
    ) THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" 
        FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_id_fkey'
    ) THEN
        ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" 
        FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'file_assets_user_id_fkey'
    ) THEN
        ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
```

### Step 4: Run the SQL

1. Click the **"Run"** button (or press Ctrl+Enter)
2. Wait for it to complete
3. You should see "Success. No rows returned"

### Step 5: Verify Tables Were Created

1. In Supabase, click **"Table Editor"** in the left sidebar
2. You should now see these new tables:
   - ✅ `reports`
   - ✅ `audit_logs`
   - ✅ `file_assets`

### Step 6: Test Your Website

1. Go to your deployed website
2. Try creating a project
3. Navigate to different pages
4. HTTP 500 errors should be gone!

## Alternative: If SQL Editor Doesn't Work

If you can't access SQL Editor, use `psql` command line:

```bash
# Connect to Supabase
psql "postgresql://postgres.ybmauetbeakurugikmpb:ABDULraouf%401@db.ybmauetbeakurugikmpb.supabase.co:5432/postgres"

# Then paste the SQL from Step 3
```

## Troubleshooting

### Error: "relation already exists"
**Solution**: Tables already exist, you're good! Skip to verification.

### Error: "permission denied"
**Solution**: Make sure you're logged in as the project owner in Supabase.

### Error: "foreign key constraint"
**Solution**: The SQL script handles this with `IF NOT EXISTS` checks.

## After Migration

Your website should now:
- ✅ Load without HTTP 500 errors
- ✅ Allow creating projects
- ✅ Allow uploading files
- ✅ Show dashboard correctly
- ✅ All features working

## Verification Checklist

After running the SQL:

- [ ] Tables visible in Supabase Table Editor
- [ ] Website loads without errors
- [ ] Can create projects
- [ ] Can navigate all pages
- [ ] Dashboard shows data
- [ ] No HTTP 500 in browser console

## Why This Happened

The local migration worked, but it only updated your local database connection. Your production Supabase database needed the same migration applied directly.

## Summary

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Paste the SQL from Step 3
4. Click Run
5. Verify tables exist
6. Test your website

**Your website will be fixed!** 🚀
