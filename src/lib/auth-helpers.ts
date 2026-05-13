import { getUser } from "@/lib/supabase-auth-server";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  const supabaseUser = await getUser();
  
  console.log("[auth-helpers] Supabase user:", supabaseUser?.id || "null");
  
  if (!supabaseUser) {
    return null;
  }

  // Get user from our database
  const dbUser = await db.user.findUnique({
    where: { id: supabaseUser.id },
  });

  console.log("[auth-helpers] DB user:", dbUser?.id || "null");

  return dbUser;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    return {
      error: "Unauthorized",
      status: 401,
      user: null,
    };
  }

  return {
    error: null,
    status: 200,
    user,
  };
}
