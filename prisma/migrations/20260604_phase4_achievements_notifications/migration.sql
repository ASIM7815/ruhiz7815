-- Phase 4: Achievements, Notifications, and Endorsements System

-- Add achievement_points to User table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "achievement_points" INTEGER NOT NULL DEFAULT 0;

-- Create AchievementCategory enum
DO $$ BEGIN
    CREATE TYPE "AchievementCategory" AS ENUM ('PROJECT', 'SOCIAL', 'SKILL', 'COMMUNITY', 'MILESTONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ActivityType enum
DO $$ BEGIN
    CREATE TYPE "ActivityType" AS ENUM ('PROJECT_CREATED', 'PROJECT_COMPLETED', 'RESOURCE_SHARED', 'ENDORSEMENT_RECEIVED', 'MILESTONE_REACHED', 'GROUP_JOINED', 'ACHIEVEMENT_UNLOCKED', 'PROFILE_UPDATED', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create NotificationType enum (if not exists)
DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM (
        'PROJECT_INVITE',
        'PROJECT_JOIN_REQUEST',
        'PROJECT_JOIN_APPROVED',
        'PROJECT_JOIN_REJECTED',
        'MESSAGE_RECEIVED',
        'CALL_MISSED',
        'ENDORSEMENT_RECEIVED',
        'ACHIEVEMENT_UNLOCKED',
        'FOLLOWER_NEW',
        'MENTION',
        'STUDY_GROUP_INVITE',
        'STUDY_GROUP_JOIN_REQUEST',
        'SYSTEM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create achievements table
CREATE TABLE IF NOT EXISTS "achievements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "points" INTEGER NOT NULL,
    "requirement" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS "user_achievements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" JSONB,
    CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_achievements_user_id_achievement_id_unique" UNIQUE ("user_id", "achievement_id")
);

-- Create indexes for user_achievements
CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "user_achievements"("user_id");
CREATE INDEX IF NOT EXISTS "user_achievements_achievement_id_idx" ON "user_achievements"("achievement_id");

-- Create activities table
CREATE TABLE IF NOT EXISTS "activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for activities
CREATE INDEX IF NOT EXISTS "activities_user_id_idx" ON "activities"("user_id");
CREATE INDEX IF NOT EXISTS "activities_type_idx" ON "activities"("type");
CREATE INDEX IF NOT EXISTS "activities_created_at_idx" ON "activities"("created_at");

-- Update notifications table (add data field and indexes if not exists)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "data" JSONB;

-- Create indexes for notifications (if not exists)
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications"("read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

-- Update endorsements table (add message field if not exists)
ALTER TABLE "endorsements" ADD COLUMN IF NOT EXISTS "message" TEXT;
