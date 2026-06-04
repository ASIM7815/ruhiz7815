import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { db } from "@/lib/db";
import { AuthenticationError, AuthorizationError } from "@/lib/api-errors";

// ── Authentication ────────────────────────────────────────────────────

export async function requireAuth(req?: NextRequest) {
  const supabaseUser = await getUser();

  if (!supabaseUser) {
    throw new AuthenticationError("Authentication required");
  }

  // Get user from database
  const user = await db.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (!user) {
    throw new AuthenticationError("User not found in database");
  }

  return user;
}

// ── Role-Based Access Control ─────────────────────────────────────────

type UserRole = "STUDENT" | "ADMIN" | "MODERATOR";

export async function requireRole(
  roles: UserRole | UserRole[],
  req?: NextRequest
) {
  const user = await requireAuth(req);

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new AuthorizationError(
      `Required role: ${allowedRoles.join(" or ")}`
    );
  }

  return user;
}

// ── Resource Ownership ────────────────────────────────────────────────

export async function requireOwnership(
  resourceUserId: string,
  req?: NextRequest
) {
  const user = await requireAuth(req);

  if (user.id !== resourceUserId) {
    throw new AuthorizationError("You can only access your own resources");
  }

  return user;
}

// ── Optional Authentication ───────────────────────────────────────────

export async function getAuthUser(req?: NextRequest) {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}

// ── API Key Authentication (for webhooks, cron jobs) ──────────────────

export function requireApiKey(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const validKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || !validKey || apiKey !== validKey) {
    throw new AuthenticationError("Invalid API key");
  }

  return true;
}
