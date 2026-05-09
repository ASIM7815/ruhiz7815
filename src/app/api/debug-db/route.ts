import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check 1: Environment variable
  results.checks.envVar = {
    DATABASE_URL: process.env.DATABASE_URL ? "✓ Set" : "✗ Missing",
    urlLength: process.env.DATABASE_URL?.length || 0,
    urlPrefix: process.env.DATABASE_URL?.substring(0, 20) || "N/A",
  };

  // Check 2: Try to connect
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      results.checks.connection = "✓ Connected successfully";
      
      // Try a simple query
      const result = await client.query("SELECT NOW() as time, version() as version");
      results.checks.query = {
        status: "✓ Query successful",
        serverTime: result.rows[0].time,
        version: result.rows[0].version.substring(0, 50) + "...",
      };
      
      client.release();
      await pool.end();
    } catch (error) {
      results.checks.connection = {
        status: "✗ Connection failed",
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code || "unknown",
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
