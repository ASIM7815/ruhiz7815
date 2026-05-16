# Quick Fix: Join Requests Not Showing

## Problem
Join requests submitted by users don't appear in the project owner's "Join Requests" page.

## Root Cause
RLS (Row Level Security) is enabled on Prisma tables, causing parsing errors.

## Quick Fix (2 Minutes)

### 1. Open Supabase SQL Editor
- Go to https://supabase.com/dashboard
- Select your project
- Click "SQL Editor" → "New query"

### 2. Run This SQL

```sql
ALTER TABLE join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### 3. Click "Run"

### 4. Test
- Submit a join request as a user
- Check the "Join Requests" page as the project owner
- Requests should now appear! ✅

## Why This Works

Your API routes use the service role key (bypasses RLS) and handle authentication with `requireAuth()`. Having RLS enabled was causing errors without providing security.

## Is This Safe?

✅ **Yes!** Your API routes already handle authentication and authorization. RLS is not needed for Prisma-managed tables.

## Full Fix

For a complete fix that disables RLS on all Prisma tables, see `FIX-JOIN-REQUESTS-NOT-SHOWING.md`.

---

**Time:** 2 minutes  
**Difficulty:** Easy  
**Result:** Join requests working! 🎉
