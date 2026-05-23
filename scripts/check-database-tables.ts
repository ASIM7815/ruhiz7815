import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Checking tables in database...");
    
    // Check if tables exist
    const tablesQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log("Found tables in public schema:");
    const tableNames = tablesQuery.rows.map(r => r.table_name);
    console.log(tableNames.join(", "));

    // Check columns and check constraints of group_conversations if it exists
    if (tableNames.includes("group_conversations")) {
      console.log("\n--- group_conversations columns ---");
      const cols = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'group_conversations';
      `);
      console.table(cols.rows);

      // Check current rows
      const rows = await client.query("SELECT * FROM group_conversations;");
      console.log(`\nFound ${rows.rowCount} rows in group_conversations:`);
      console.log(rows.rows);
    } else {
      console.log("\nWARNING: group_conversations table does not exist in the database!");
    }

    if (tableNames.includes("group_participants")) {
      console.log("\n--- group_participants columns ---");
      const cols = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'group_participants';
      `);
      console.table(cols.rows);

      // Check current rows
      const rows = await client.query("SELECT * FROM group_participants;");
      console.log(`\nFound ${rows.rowCount} rows in group_participants:`);
      console.log(rows.rows);
    }

  } catch (err) {
    console.error("Error checking tables:", err);
  } finally {
    client.release();
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
