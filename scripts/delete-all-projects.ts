import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("DATABASE_URL is:", process.env.DATABASE_URL ? "Set (length: " + process.env.DATABASE_URL.length + ")" : "Not set");
  console.log("Fetching projects...");
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      title: true,
      owner: {
        select: {
          name: true,
          email: true,
        }
      }
    }
  });

  console.log(`Found ${projects.length} projects:`);
  for (const p of projects) {
    console.log(`- [${p.id}] ${p.title} (Owner: ${p.owner?.name || "Unknown"} <${p.owner?.email || "Unknown"}>)`);
  }

  if (projects.length > 0) {
    console.log("Deleting all projects...");
    const deleteCount = await prisma.project.deleteMany({});
    console.log(`Deleted ${deleteCount.count} projects.`);
  } else {
    console.log("No projects to delete.");
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
