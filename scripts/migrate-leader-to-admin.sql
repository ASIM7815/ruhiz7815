-- Migration: Normalize LEADER roles to ADMIN
-- Date: 2026-05-17
-- Description: Updates all LEADER roles to ADMIN for consistency across the platform

BEGIN;

-- Update study_group_members roles
UPDATE study_group_members 
SET role = 'ADMIN' 
WHERE role = 'LEADER';

-- Update project_members roles (if any exist with LEADER)
UPDATE project_members 
SET role = 'ADMIN' 
WHERE role = 'LEADER';

-- Update users roles (if any exist with LEADER or BOTH)
UPDATE users 
SET role = 'ADMIN' 
WHERE role IN ('LEADER', 'BOTH');

COMMIT;

-- Show results
SELECT 'study_group_members' as table_name, COUNT(*) as admin_count 
FROM study_group_members WHERE role = 'ADMIN'
UNION ALL
SELECT 'project_members', COUNT(*) 
FROM project_members WHERE role = 'ADMIN'
UNION ALL
SELECT 'users', COUNT(*) 
FROM users WHERE role = 'ADMIN';
