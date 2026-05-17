-- Migration: Normalize LEADER roles to ADMIN
-- Date: 2026-05-17
-- Description: Updates all LEADER roles to ADMIN for consistency across the platform

-- Update StudyGroupMember roles
UPDATE "StudyGroupMember" 
SET role = 'ADMIN' 
WHERE role = 'LEADER';

-- Update ProjectMember roles (if any exist with LEADER)
UPDATE "ProjectMember" 
SET role = 'ADMIN' 
WHERE role = 'LEADER';

-- Update User roles (if any exist with LEADER or BOTH)
UPDATE "User" 
SET role = 'ADMIN' 
WHERE role IN ('LEADER', 'BOTH');
