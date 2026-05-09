import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase-auth-server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check 1: Environment variables
  results.checks.envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ Set" : "✗ Missing",
    DATABASE_URL: process.env.DATABASE_URL ? "✓ Set" : "✗ Missing",
  };

  // Check 2: Supabase client
  try {
    const supabase = await createClient();
    results.checks.supabaseClient = "✓ Client created";

    // Check 3: Get user
    const user = await getUser();
    results.checks.supabaseUser = {
      status: user ? "✓ User found" : "✗ No user (not logged in)",
      userId: user?.id || null,
      email: user?.email || null,
    };

    // Check 4: Database user
    if (user) {
      try {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
        });
        results.checks.databaseUser = {
          status: dbUser ? "✓ User in database" : "✗ User not in database",
          userId: dbUser?.id || null,
          name: dbUser?.name || null,
          email: dbUser?.email || null,
        };
      } catch (dbError) {
        results.checks.databaseUser = {
          status: "✗ Database error",
          error: dbError instanceof Error ? dbError.message : String(dbError),
        };
      }
    }
  } catch (error) {
    results.checks.supabaseClient = {
      status: "✗ Failed to create client",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
