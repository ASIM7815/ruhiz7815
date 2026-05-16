# Supabase Database Migration Guide

## Problem
Your deployed website is showing HTTP 500 errors because the Supabase database schema is outdated. The new tables (`Report`, `AuditLog`, `FileAsset`, etc.) don't exist in production.

## Solution: Apply Prisma Migrations to Supabase

### Step 1: Verify Your Database URL

Check your `.env.local` or `.env.production` file has the correct Supabase connection string:

```env
DATABASE_URL="postgresql://postgres.ybmauetbeakurugikmpb:ABDULraouf%401@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### Step 2: Apply Migrations to Supabase

Run this command to apply all pending migrations:

```bash
npx prisma migrate deploy
```

This will:
- Connect to your Supabase database
- Apply all migrations in order
- Create the missing tables and columns

### Step 3: Verify Migration Success

After running the migration, verify it worked:

```bash
npx prisma studio
```

This opens a GUI where you can see all your tables. Check that these tables exist:
- ✅ `Report`
- ✅ `AuditLog`
- ✅ `FileAsset`
- ✅ All other tables from your schema

### Step 4: Redeploy Your Website

After migrations are applied:

```bash
# If using Vercel
git add .
git commit -m "Apply database migrations"
git push origin main

# Vercel will auto-redeploy
```

Or trigger a manual redeploy in your hosting dashboard.

## Alternative: Direct SQL Migration

If `prisma migrate deploy` doesn't work, you can apply migrations manually via Supabase SQL Editor:

### 1. Go to Supabase Dashboard
- Open https://supabase.com/dashboard
- Select your project
- Go to "SQL Editor"

### 2. Run Migration SQL

Copy and paste the SQL from each migration file:

#### Migration 1: Add Reports, Audit Logs, and File Assets

```sql
-- From: prisma/migrations/20250101000000_add_reports_audit_files/migration.sql

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_entity_type_entity_id_idx" ON "reports"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "file_assets_user_id_idx" ON "file_assets"("user_id");

-- CreateIndex
CREATE INDEX "file_assets_entity_type_entity_id_idx" ON "file_assets"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### 3. Click "Run" to Execute

The SQL will create all missing tables and indexes.

## Verification Checklist

After applying migrations, verify:

- [ ] No SQL errors in Supabase logs
- [ ] All tables visible in Supabase Table Editor
- [ ] Website loads without 500 errors
- [ ] Can create projects, startups, study groups
- [ ] Can upload files
- [ ] Can view dashboard

## Common Issues & Solutions

### Issue 1: "relation already exists"
**Cause**: Table already exists
**Solution**: Skip that specific CREATE TABLE statement

### Issue 2: "permission denied"
**Cause**: Using pooler URL instead of direct URL
**Solution**: Use direct connection URL for migrations:
```env
# For migrations, use direct URL (port 5432)
DATABASE_URL="postgresql://postgres.ybmauetbeakurugikmpb:ABDULraouf%401@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

### Issue 3: "connection timeout"
**Cause**: Network or firewall issue
**Solution**: 
1. Check your internet connection
2. Try from different network
3. Use Supabase SQL Editor instead

### Issue 4: "migration failed"
**Cause**: Conflicting data or schema
**Solution**:
1. Check Supabase logs for specific error
2. Fix the issue manually
3. Mark migration as resolved:
```bash
npx prisma migrate resolve --applied <migration-name>
```

## Production Deployment Checklist

Before deploying to production:

1. **Backup Database**
   ```bash
   # In Supabase Dashboard
   # Go to Database > Backups
   # Create manual backup
   ```

2. **Apply Migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Verify Schema**
   ```bash
   npx prisma studio
   ```

4. **Test Locally**
   ```bash
   npm run build
   npm start
   ```

5. **Deploy**
   ```bash
   git push origin main
   ```

6. **Monitor Logs**
   - Check Vercel logs
   - Check Supabase logs
   - Check browser console

## Environment Variables for Production

Make sure your production environment has:

```env
# Database (use direct URL for migrations, pooler for runtime)
DATABASE_URL="postgresql://postgres.ybmauetbeakurugikmpb:ABDULraouf%401@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://ybmauetbeakurugikmpb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# GCS
GCS_BUCKET_NAME="ruhiz"
GCS_CREDENTIALS='{"type":"service_account",...}'
```

## Quick Fix Commands

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Open database GUI
npx prisma studio

# Check migration status
npx prisma migrate status

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

## Success Indicators

After successful migration, you should see:

✅ No HTTP 500 errors on website
✅ All pages load correctly
✅ Can create and view projects
✅ Can upload resources
✅ Dashboard shows stats
✅ No database errors in logs

## Next Steps

1. **Apply migrations** using one of the methods above
2. **Verify** all tables exist in Supabase
3. **Redeploy** your website
4. **Test** all features
5. **Monitor** for any errors

Your website will be live and working! 🚀
