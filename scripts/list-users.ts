import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Listing users in database...");
    const res = await client.query("SELECT id, name, email, role FROM users LIMIT 10;");
    console.table(res.rows);
  } finally {
    client.release();
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
