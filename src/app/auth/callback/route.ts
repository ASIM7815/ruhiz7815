import { createClient } from "@/lib/supabase-auth-server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  console.log("[auth/callback] Received code:", code ? "yes" : "no");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[auth/callback] Exchange result:", { 
      hasUser: !!data.user, 
      error: error?.message 
    });

    if (error) {
      console.error("[auth/callback] Auth error:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (data.user) {
      // Sync user with our database
      const supabaseUser = data.user;
      
      console.log("[auth/callback] Syncing user:", supabaseUser.email);
      
      try {
        // Check if user exists in our database
        let dbUser = await db.user.findUnique({
          where: { email: supabaseUser.email! },
        });

        if (!dbUser) {
          // Create new user with unique UID
          const uid = String(Math.floor(10000 + Math.random() * 90000));
          
          console.log("[auth/callback] Creating new user with UID:", uid);
          
          dbUser = await db.user.create({
            data: {
              id: supabaseUser.id,
              email: supabaseUser.email!,
              name: supabaseUser.user_metadata.full_name || supabaseUser.email!.split("@")[0],
              image: supabaseUser.user_metadata.avatar_url,
              uid,
              emailVerified: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
              onboardingComplete: false,
            },
          });
        } else {
          console.log("[auth/callback] User already exists:", dbUser.id);
        }
      } catch (err) {
        console.error("[auth/callback] Error syncing user:", err);
      }
    }
  }

  // Redirect to dashboard after successful login
  console.log("[auth/callback] Redirecting to dashboard");
  return NextResponse.redirect(`${origin}/dashboard`);
}
