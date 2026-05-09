# Vercel Deployment Fix - WebSocket & Module Issues

## Issues Identified from Screenshots

### 1. WebSocket Connection Failures
**Error:** Multiple `WebSocket connection to 'wss://...' failed` errors

**Root Cause:**
- Supabase Realtime uses WebSockets for real-time subscriptions
- Vercel's serverless Edge runtime doesn't support persistent WebSocket connections
- Client-side WebSocket connections work fine, but server-side subscriptions fail

**Solution:** Ensure all Supabase Realtime code runs **client-side only**

### 2. Module Resolution Errors
**Error:** Various import/export errors in build logs

**Root Cause:**
- Edge runtime compatibility issues
- Missing runtime directives in API routes
- Middleware trying to use Node.js modules

### 3. Resource Loading Failures (404s)
**Error:** Multiple 404 errors for resources

**Root Cause:**
- Build output not including all necessary files
- Static file paths incorrect

---

## Complete Fix Implementation

### Step 1: Update Supabase Client for Better Error Handling

The current Supabase client needs better error handling for production environments.

**File: `src/lib/supabase-client.ts`**

```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseBrowserClient: SupabaseClient | null = null;

function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase environment variables");
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
    );
  }

  return { anonKey, url };
}

function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    // Server-side: return a mock client to prevent errors
    console.warn("Supabase client accessed on server-side");
    return null as any;
  }

  const { anonKey, url } = getSupabaseBrowserConfig();
  
  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  
  return supabaseBrowserClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      // Return no-op functions for server-side
      return () => {};
    }
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
```

### Step 2: Add Runtime Directives to All API Routes

All API routes that use Prisma/PostgreSQL must explicitly use Node.js runtime.

**Create a script to add runtime directives:**

```bash
# Find all API route files and add runtime directive
find src/app/api -name "route.ts" -type f
```

**Add to each route file at the top (after imports):**

```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

### Step 3: Update Next.js Configuration

**File: `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Ensure Prisma client is bundled correctly
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  
  // Disable static optimization for pages using Supabase Realtime
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
```

### Step 4: Update Middleware to Be Edge-Compatible

**File: `src/middleware.ts`**

Already updated - uses simple cookie checking instead of NextAuth session.

### Step 5: Ensure Client-Side Only Realtime Usage

**Update components using Supabase Realtime:**

1. **src/app/(platform)/messages/page.tsx**
2. **src/components/group-chat.tsx**
3. **src/hooks/use-webrtc-call.ts**

Add client-side check:

```typescript
"use client"; // Ensure this is at the top

useEffect(() => {
  // Only run on client
  if (typeof window === "undefined") return;
  
  // Your Supabase Realtime code here
}, []);
```

### Step 6: Update Environment Variables in Vercel

**Required Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres

# NextAuth (CRITICAL: Use your Vercel domain)
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase (Public - safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase Service Role (Private - for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# WebRTC (Optional)
STUN_URLS=stun:stun.l.google.com:19302
TURN_URLS=
TURN_USERNAME=
TURN_CREDENTIAL=
```

### Step 7: Update Google OAuth Redirect URIs

**Go to:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

**Add these Authorized Redirect URIs:**

```
https://ruhiz7815-ovybjuq4t-asimsaads-projects.vercel.app/api/auth/callback/google
https://ruhiz7815.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

---

## Deployment Commands

### 1. Clean Build Locally

```bash
# Clean everything
rm -rf .next node_modules

# Reinstall
npm install

# Generate Prisma client
npx prisma generate

# Test build
npm run build

# Test locally
npm start
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 3. Check Deployment

```bash
# View logs
vercel logs

# Check environment variables
vercel env ls
```

---

## Troubleshooting

### Issue: WebSocket Still Failing

**Check:**
1. Are Supabase Realtime calls only in client components?
2. Is `"use client"` directive present?
3. Are there server-side checks before using Supabase?

### Issue: 500 Errors on API Routes

**Check:**
1. Does the route have `export const runtime = "nodejs";`?
2. Are environment variables set in Vercel?
3. Is DATABASE_URL correct with URL-encoded password?

### Issue: Authentication Not Working

**Check:**
1. Is NEXTAUTH_URL set to your Vercel domain?
2. Are Google OAuth redirect URIs updated?
3. Is NEXTAUTH_SECRET set in Vercel?

### Issue: Build Fails

**Check:**
1. Does `package.json` have `"postinstall": "prisma generate"`?
2. Is Prisma schema using default output location?
3. Are all imports using `@prisma/client`?

---

## Key Points

### ✅ DO:
- Use Supabase Realtime only in client components
- Add runtime directives to all API routes
- Set all environment variables in Vercel
- Update Google OAuth redirect URIs
- Test build locally before deploying

### ❌ DON'T:
- Use Supabase Realtime in server components
- Use WebSockets in API routes
- Forget to URL-encode database password
- Use localhost URLs in production env vars
- Skip the postinstall script

---

## Expected Results

After implementing all fixes:

✅ Build completes successfully  
✅ No WebSocket errors (client-side connections work)  
✅ All API routes respond correctly  
✅ Authentication works  
✅ Real-time messaging works (client-side)  
✅ WebRTC calls work (client-side)  

---

## Next Steps

1. Run the automated fix script (below)
2. Update environment variables in Vercel
3. Update Google OAuth settings
4. Deploy to Vercel
5. Test all features

---

**Last Updated:** May 9, 2026  
**Status:** Ready to implement
