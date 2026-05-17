/**
 * Data Migration Script: Normalize LEADER roles to ADMIN
 * 
 * This script updates all LEADER roles to ADMIN across the database
 * for consistency with the new role normalization in Phase 0.
 * 
 * Run with: NODE_ENV=development npx tsx scripts/migrate-leader-to-admin.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Starting role migration: LEADER → ADMIN");
  console.log("=" .repeat(50));

  try {
    // Update StudyGroupMember roles
    console.log("\n📋 Updating StudyGroupMember roles...");
    const studyGroupResult = await prisma.$executeRaw`
      UPDATE "StudyGroupMember" 
      SET role = 'ADMIN' 
      WHERE role = 'LEADER'
    `;
    console.log(`✅ Updated ${studyGroupResult} StudyGroupMember records`);

    // Update ProjectMember roles
    console.log("\n📋 Updating ProjectMember roles...");
    const projectMemberResult = await prisma.$executeRaw`
      UPDATE "ProjectMember" 
      SET role = 'ADMIN' 
      WHERE role = 'LEADER'
    `;
    console.log(`✅ Updated ${projectMemberResult} ProjectMember records`);

    // Update User roles
    console.log("\n📋 Updating User roles...");
    const userResult = await prisma.$executeRaw`
      UPDATE "User" 
      SET role = 'ADMIN' 
      WHERE role IN ('LEADER', 'BOTH')
    `;
    console.log(`✅ Updated ${userResult} User records`);

    console.log("\n" + "=".repeat(50));
    console.log("✅ Migration completed successfully!");
    console.log(`\nTotal records updated: ${studyGroupResult + projectMemberResult + userResult}`);

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
