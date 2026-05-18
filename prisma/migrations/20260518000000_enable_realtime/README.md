# Enable Realtime Migration

**Date**: 2026-05-18  
**Feature**: Real-Time Data Synchronization

## Purpose

This migration enables Supabase Realtime for tables that require real-time updates across the application. This allows users to see instant updates without manual page refreshes.

## Tables Enabled for Realtime

1. **direct_messages** - One-on-one message delivery
2. **group_messages** - Group message delivery
3. **join_requests** - Join request notifications
4. **project_members** - Project member list updates
5. **study_group_members** - Study group member list updates
6. **projects** - Project detail updates
7. **study_groups** - Study group detail updates
8. **notifications** - Notification delivery

## What This Migration Does

### 1. Enables Realtime Publication
- Adds all relevant tables to the `supabase_realtime` publication
- This allows Supabase to broadcast database changes to connected clients

### 2. Ensures Row Level Security (RLS)
- Verifies RLS is enabled on all Realtime tables
- Enables RLS if not already enabled
- **Important**: RLS policies must be properly configured to ensure users only receive updates for data they're authorized to access

### 3. Creates Performance Indexes
- Adds indexes optimized for real-time filtering
- Improves query performance for real-time subscriptions
- Indexes are created with `IF NOT EXISTS` to avoid conflicts

## Security Considerations

**CRITICAL**: This migration enables Realtime but does NOT create RLS policies. You must ensure that:

1. **RLS policies exist** for all enabled tables
2. **Policies are correct** and prevent unauthorized data access
3. **Policies are tested** with different user roles

### Example RLS Policy Check

```sql
-- Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'direct_messages',
  'group_messages',
  'join_requests',
  'project_members',
  'study_group_members',
  'projects',
  'study_groups',
  'notifications'
);
```

## Performance Impact

- **Minimal impact** on database performance
- Indexes improve query performance for real-time subscriptions
- Real-time events are filtered by Supabase before reaching clients

## Rollback

To disable Realtime for these tables:

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE direct_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE group_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE join_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE project_members;
ALTER PUBLICATION supabase_realtime DROP TABLE study_group_members;
ALTER PUBLICATION supabase_realtime DROP TABLE projects;
ALTER PUBLICATION supabase_realtime DROP TABLE study_groups;
ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
```

## Testing

After applying this migration:

1. **Verify Realtime is enabled**:
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

2. **Verify RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN (
     'direct_messages', 'group_messages', 'join_requests',
     'project_members', 'study_group_members', 'projects',
     'study_groups', 'notifications'
   );
   ```

3. **Test real-time subscriptions** in the application

## Next Steps

After applying this migration:

1. ✅ Verify RLS policies are correct
2. ✅ Test real-time subscriptions with different user roles
3. ✅ Monitor Supabase Realtime dashboard for connection metrics
4. ✅ Implement Connection Manager and Subscription Manager (Phase 1)
5. ✅ Implement feature-specific React hooks (Phase 2)

## Related Files

- `src/lib/realtime/supabase-config.ts` - Realtime configuration
- `.kiro/specs/realtime-data-sync/requirements.md` - Feature requirements
- `.kiro/specs/realtime-data-sync/design.md` - Architecture design
- `.kiro/specs/realtime-data-sync/tasks.md` - Implementation tasks
