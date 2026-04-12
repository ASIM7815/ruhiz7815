import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import "dotenv/config";

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const sql = readFileSync("/tmp/ruhiz_schema.sql", "utf-8");

// Split by semicolons and filter out empty statements
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => {
    // Remove comment-only lines to check if there's actual SQL
    const withoutComments = s.replace(/--.*$/gm, "").trim();
    return withoutComments.length > 0;
  });

console.log(`Executing ${statements.length} statements...`);

for (const stmt of statements) {
  try {
    await client.execute(stmt);
    const firstLine = stmt.split("\n").find((l) => l.trim()) || stmt.slice(0, 60);
    console.log(`  ✓ ${firstLine.trim().slice(0, 80)}`);
  } catch (err) {
    console.error(`  ✗ ${stmt.slice(0, 80)}...`);
    console.error(`    ${err.message}`);
  }
}

console.log("Done!");
process.exit(0);
