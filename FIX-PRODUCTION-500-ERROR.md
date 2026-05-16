# Fix Production HTTP 500 Error - Quick Guide

## The Problem
Your website is showing HTTP 500 errors because your Supabase database doesn't have the new tables (`Report`, `AuditLog`, `FileAsset`, etc.).

## The Solution (3 Easy Steps)

### Step 1: Apply Migrations

Run this command in your terminal:

```bash
npx prisma migrate deploy
```

This will update your Supabase database with all the new tables.

### Step 2: Verify It Worked

Check that the tables were created:

```bash
npx prisma studio
```

This opens a GUI. Look for these tables:
- ✅ Report
- ✅ AuditLog  
- ✅ FileAsset
- ✅ All other tables

### Step 3: Redeploy Your Website

```bash
git add .
git commit -m "Apply database migrations"
git push origin main
```

Your hosting platform (Vercel) will automatically redeploy.

## Alternative: Use the Script

I created a script that does everything for you:

```bash
./apply-migrations.sh
```

## If That Doesn't Work: Manual SQL Method

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Copy the SQL from `prisma/migrations/20250101000000_add_reports_audit_files/migration.sql`
5. Paste it in the SQL Editor
6. Click "Run"

## Verification

After applying migrations, your website should:
- ✅ Load without 500 errors
- ✅ Show dashboard correctly
- ✅ Allow creating projects
- ✅ Allow uploading files

## Still Having Issues?

Check these:

1. **Database URL correct?**
   - Check `.env.local` or `.env.production`
   - Should be your Supabase connection string

2. **Can you connect to Supabase?**
   ```bash
   npx prisma studio
   ```
   If this works, your connection is fine.

3. **Check Supabase logs**
   - Go to Supabase Dashboard
   - Click "Logs"
   - Look for errors

## Quick Commands

```bash
# Apply migrations
npx prisma migrate deploy

# View database
npx prisma studio

# Check migration status
npx prisma migrate status

# Generate Prisma client
npx prisma generate
```

## Success!

Once migrations are applied:
1. Your website will load without errors
2. All features will work
3. You can deploy with confidence

🚀 **Your website will be live and working!**
