import { createClient } from "@/lib/supabase-auth-server";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { usernameSeedFromName } from "@/lib/profile-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function generateUniqueUid() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const uid = String(Math.floor(10000 + Math.random() * 90000));
    const existing = await db.user.findUnique({
      where: { uid },
      select: { id: true },
    });

    if (!existing) return uid;
  }

  return String(Date.now()).slice(-5);
}

async function generateUniqueUsername(nameOrEmail: string) {
  const seed = usernameSeedFromName(nameOrEmail);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${Math.floor(100 + Math.random() * 9000)}`;
    const username = `${seed}${suffix}`.slice(0, 30);
    const existing = await db.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existing) return username;
  }

  return `student_${String(Date.now()).slice(-8)}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  console.log("[auth/callback] Request received:", { 
    hasCode: !!code, 
    error, 
    errorDescription,
    origin 
  });

  // Handle OAuth errors
  if (error) {
    console.error("[auth/callback] OAuth error:", error, errorDescription);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  // No code means invalid callback
  if (!code) {
    console.error("[auth/callback] No authorization code received");
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[auth/callback] Exchange result:", { 
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      hasAccessToken: !!data?.session?.access_token,
      error: exchangeError?.message 
    });

    if (exchangeError) {
      console.error("[auth/callback] Auth exchange error:", exchangeError);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (!data?.user || !data?.session) {
      console.error("[auth/callback] No user/session data received after exchange");
      return NextResponse.redirect(`${origin}/login?error=no_session`);
    }

    // Sync user with our database
    const supabaseUser = data.user;
    const provider = supabaseUser.app_metadata.provider || 'email';
    
    console.log("[auth/callback] Syncing user:", {
      email: supabaseUser.email,
      provider,
      id: supabaseUser.id
    });
    console.log("[auth/callback] User metadata:", JSON.stringify(supabaseUser.user_metadata, null, 2));
    
    try {
      // Check if user exists in our database by email (not by ID)
      let dbUser = await db.user.findUnique({
        where: { email: supabaseUser.email! },
      });

      if (!dbUser) {
        // Create new user with Supabase ID and unique UID
        const uid = await generateUniqueUid();
        
        // Extract name based on provider
        let userName = supabaseUser.email!.split("@")[0];
        if (provider === 'google') {
          userName = supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.name || userName;
        } else if (provider === 'github') {
          userName = supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.user_name || supabaseUser.user_metadata.name || userName;
        }
        
        // Extract avatar based on provider
        const avatarUrl = supabaseUser.user_metadata.avatar_url || supabaseUser.user_metadata.picture;
        const username = await generateUniqueUsername(userName || supabaseUser.email!);
        
        console.log("[auth/callback] Creating new user:", {
          uid,
          username,
          name: userName,
          email: supabaseUser.email,
          provider
        });
        
        dbUser = await db.user.create({
          data: {
            id: supabaseUser.id, // Use Supabase UUID as primary key
            email: supabaseUser.email!,
            name: userName,
            image: avatarUrl,
            uid,
            username,
            emailVerified: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
            onboardingComplete: false,
          },
        });
        
        console.log("[auth/callback] ✅ User created successfully:", dbUser.id);
      } else {
        console.log("[auth/callback] ✅ User already exists:", dbUser.id);
        
        // IMPORTANT: If user ID doesn't match Supabase ID, we need to migrate
        if (dbUser.id !== supabaseUser.id) {
          console.log("[auth/callback] ⚠️ User ID mismatch - old:", dbUser.id, "new:", supabaseUser.id);
          console.log("[auth/callback] Migrating user to new Supabase ID...");
          
          // Store old user data
          const oldUserData = { ...dbUser };
          
          // Delete old user record
          await db.user.delete({
            where: { id: dbUser.id },
          });
          
          // Create new user with Supabase ID
          dbUser = await db.user.create({
            data: {
              id: supabaseUser.id,
              uid: oldUserData.uid,
              username: oldUserData.username,
              email: oldUserData.email,
              name: oldUserData.name,
              image: oldUserData.image,
              coverImage: oldUserData.coverImage,
              headline: oldUserData.headline,
              bio: oldUserData.bio,
              university: oldUserData.university,
              role: oldUserData.role,
              reputation: oldUserData.reputation,
              collegeVerified: oldUserData.collegeVerified,
              emailVerified: oldUserData.emailVerified,
              onboardingComplete: oldUserData.onboardingComplete,
            },
          });
          
          console.log("[auth/callback] ✅ User migrated successfully to new ID:", dbUser.id);
        }
        
        // Update user info if needed
        const updates: Prisma.UserUpdateInput = {};
        
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
        if (!dbUser.uid) updates.uid = await generateUniqueUid();
        if (!dbUser.username) {
          updates.username = await generateUniqueUsername(dbUser.name || dbUser.email);
        }
        
        if (Object.keys(updates).length > 0) {
          await db.user.update({
            where: { id: dbUser.id },
            data: updates,
          });
          console.log("[auth/callback] ✅ User updated:", updates);
        }
      }
    } catch (dbError) {
      console.error("[auth/callback] ❌ Database error:", dbError);
      // Continue to redirect even if DB sync fails
    }

    // Redirect to a client-side page that will handle the redirect
    console.log("[auth/callback] ✅ Redirecting to auth-complete");
    return NextResponse.redirect(`${origin}/auth-complete`);
    
  } catch (err) {
    console.error("[auth/callback] ❌ Unexpected error:", err);
    return NextResponse.redirect(`${origin}/login?error=unexpected`);
  }
}
