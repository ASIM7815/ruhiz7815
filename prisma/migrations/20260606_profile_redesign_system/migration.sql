-- Profile Redesign System Migration
-- Phase 1: Database Schema Updates

-- Add new fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "longest_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "total_contributions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_activity_date" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twitter_username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "portfolio_url" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "custom_badges" JSONB;

-- Create social_links table
CREATE TABLE IF NOT EXISTS "social_links" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "username" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "social_links_user_id_platform_unique" UNIQUE ("user_id", "platform")
);

CREATE INDEX IF NOT EXISTS "social_links_user_id_display_order_idx" ON "social_links"("user_id", "display_order");

-- Create featured_items table
CREATE TABLE IF NOT EXISTS "featured_items" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "thumbnail" TEXT,
    "icon" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "featured_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "featured_items_user_id_is_pinned_display_order_idx" ON "featured_items"("user_id", "is_pinned", "display_order");

-- Create daily_activities table
CREATE TABLE IF NOT EXISTS "daily_activities" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "activity_count" INTEGER NOT NULL DEFAULT 0,
    "activity_types" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "daily_activities_user_id_date_unique" UNIQUE ("user_id", "date")
);

CREATE INDEX IF NOT EXISTS "daily_activities_user_id_date_idx" ON "daily_activities"("user_id", "date");

-- Create skill_endorsements table
CREATE TABLE IF NOT EXISTS "skill_endorsements" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "skill_name" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "giver_id" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_endorsements_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "skill_endorsements_giver_id_fkey" FOREIGN KEY ("giver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "skill_endorsements_skill_name_receiver_id_giver_id_unique" UNIQUE ("skill_name", "receiver_id", "giver_id")
);

CREATE INDEX IF NOT EXISTS "skill_endorsements_receiver_id_skill_name_idx" ON "skill_endorsements"("receiver_id", "skill_name");
CREATE INDEX IF NOT EXISTS "skill_endorsements_giver_id_idx" ON "skill_endorsements"("giver_id");
