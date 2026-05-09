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
      const provider = supabaseUser.app_metadata.provider || 'email';
      
      console.log("[auth/callback] Syncing user:", supabaseUser.email, "Provider:", provider);
      console.log("[auth/callback] User metadata:", JSON.stringify(supabaseUser.user_metadata, null, 2));
      
      try {
        // Check if user exists in our database
        let dbUser = await db.user.findUnique({
          where: { email: supabaseUser.email! },
        });

        if (!dbUser) {
          // Create new user with unique UID and store the provider
          const uid = String(Math.floor(10000 + Math.random() * 90000));
          
          // Extract name based on provider
          let userName = supabaseUser.email!.split("@")[0];
          if (provider === 'google') {
            userName = supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.name || userName;
          } else if (provider === 'github') {
            userName = supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.user_name || supabaseUser.user_metadata.name || userName;
          }
          
          // Extract avatar based on provider
          let avatarUrl = supabaseUser.user_metadata.avatar_url || supabaseUser.user_metadata.picture;
          
          console.log("[auth/callback] Creating new user with UID:", uid, "Name:", userName, "Avatar:", avatarUrl);
          
          dbUser = await db.user.create({
            data: {
              id: supabaseUser.id,
              email: supabaseUser.email!,
              name: userName,
              image: avatarUrl,
              uid,
              emailVerified: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
              onboardingComplete: false,
            },
          });
          
          console.log("[auth/callback] User created successfully:", dbUser.id);
        } else {
          console.log("[auth/callback] User already exists:", dbUser.id);
          
          // Update user info if needed (e.g., avatar changed)
          const updates: any = {};
          
          if (provider === 'google') {
            const newName = supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.name;
            const newAvatar = supabaseUser.user_metadata.avatar_url || supabaseUser.user_metadata.picture;
            if (newName && newName !== dbUser.name) updates.name = newName;
            if (newAvatar && newAvatar !== dbUser.image) updates.image = newAvatar;
          } else if (provider === 'github') {
            const newName = supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.user_name || supabaseUser.user_metadata.name;
            const newAvatar = supabaseUser.user_metadata.avatar_url;
            if (newName && newName !== dbUser.name) updates.name = newName;
            if (newAvatar && newAvatar !== dbUser.image) updates.image = newAvatar;
          }
          
          if (Object.keys(updates).length > 0) {
            await db.user.update({
              where: { id: dbUser.id },
              data: updates,
            });
            console.log("[auth/callback] User updated:", updates);
          }
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
