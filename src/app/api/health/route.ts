import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check endpoint for monitoring
 * Returns 200 if all services are healthy, 503 if any are down
 */
export async function GET() {
  const checks: Record<string, boolean> = {};
  let allHealthy = true;

  // Check database
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error("Database health check failed:", error);
    checks.database = false;
    allHealthy = false;
  }

  // Check environment variables
  checks.env = !!(
    process.env.DATABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!checks.env) {
    allHealthy = false;
  }

  const status = allHealthy ? "healthy" : "degraded";
  const statusCode = allHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.npm_package_version || "unknown",
    },
    { status: statusCode }
  );
}
