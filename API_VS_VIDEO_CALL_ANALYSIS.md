# RUHIZ Codebase Analysis: Why API Calls Fail While Video Calling Still Works

## Scope

This report is based on a full code-level walkthrough of the current `next@16` application in `src/app`, `src/components`, `src/hooks`, `src/lib`, `prisma`, and the Supabase setup scripts. It covers:

- frontend routing and component structure
- backend route-handler architecture
- authentication and session handling
- Prisma/PostgreSQL and Supabase data access
- messaging, realtime, and WebRTC call flow
- likely root causes for the observed inconsistency
- production hardening recommendations

I did not modify app code. I only analyzed the repository and produced this report.

## Executive Summary

The strongest code-supported root cause is **auth/session divergence between the browser Realtime/WebRTC path and the server-authenticated `/api/*` path**.

The app currently uses **two different Supabase browser clients**:

- a cookie-backed SSR client for login and `useSupabaseUser()` via [`src/lib/supabase-auth-client.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-auth-client.ts:1)
- a plain `@supabase/supabase-js` client for Realtime, messaging subscriptions, and call signaling via [`src/lib/supabase-client.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-client.ts:1)

That split is important because:

- most normal app data loads go through `fetch("/api/...")`
- those API routes authenticate only from **server-side Supabase cookies**
- messaging realtime and video signaling authenticate from the **browser-side Supabase session**
- WebRTC media itself becomes **peer-to-peer** after signaling, so it can stay healthy even if many normal API requests are broken

There is a second architectural problem that amplifies this:

- [`src/proxy.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/proxy.ts:8) explicitly skips `/api` requests, so the proxy never refreshes or repairs Supabase cookies for API traffic

That combination explains the exact symptom pattern much better than CORS, WebSocket transport, or generic network failure.

There are also **secondary risks** that can cause similar symptoms in production:

- the frontend frequently swallows failed API responses and shows empty UI instead of surfacing the error
- the auth callback suppresses DB-sync failures and still redirects to the dashboard
- many product routes depend on Prisma tables; if migrations are incomplete in production, those routes fail while Supabase Realtime features still appear healthy

## High-Level Architecture

### Frontend

The app is a single Next.js App Router project with route groups:

- `(marketing)` for the landing page
- `(auth)` for `/login` and `/register`
- `(platform)` for authenticated product pages like dashboard, projects, messages, knowledge, marketplace, startups, settings, and profile

The platform shell is mounted in [`src/app/(platform)/layout.tsx`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/layout.tsx:1) and wraps all authenticated pages in [`CallProvider`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/components/messaging/call-provider.tsx:1).

State management is lightweight and local:

- page-level `useState` for most screens
- [`useSupabaseUser()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-supabase-user.ts:7) for client auth state
- [`CallProvider`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/components/messaging/call-provider.tsx:50) + [`useWebRTCCall()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-webrtc-call.ts:114) for call state
- no Redux, Zustand, TanStack Query, or shared API cache layer

### Backend

The backend is made of App Router route handlers under `src/app/api`:

- `40` route files in `src/app/api`
- mostly `runtime = "nodejs"` and `dynamic = "force-dynamic"`

There are **two server-side data paths**:

1. Prisma + PostgreSQL
   Used for users, projects, resources, listings, startups, study groups, profile data, and dashboard counts via [`src/lib/db.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/db.ts:1).

2. Supabase service-role client
   Used for direct messages, group messages, conversation metadata, participants, group conversations, and call sessions via [`src/lib/supabase-server.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-server.ts:1).

This is a hybrid architecture:

- product/domain data lives in PostgreSQL through Prisma
- messaging/realtime/call metadata lives in Supabase-managed tables accessed through the service-role client
- file uploads go to Google Cloud Storage via [`src/lib/gcs.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/gcs.ts:1)

### Authentication

Auth is Supabase OAuth with a custom callback route:

- browser login starts in [`src/app/(auth)/login/page.tsx`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(auth)/login/page.tsx:1)
- OAuth callback is handled in [`src/app/auth/callback/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/auth/callback/route.ts:8)
- callback exchanges the code for a session and syncs the user into the Prisma `users` table
- server route handlers authorize with [`requireAuth()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/auth-helpers.ts:23), which depends on Supabase server cookies and then looks up the matching DB user

## Request Flow Comparison

## 1. Normal API/Data Flow

Typical pages like dashboard, profile, settings, knowledge, projects, marketplace, startups, study groups, topbar search, and most messaging CRUD follow this path:

1. client component calls `fetch("/api/...")`
2. route handler calls [`requireAuth()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/auth-helpers.ts:23)
3. `requireAuth()` calls [`getUser()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-auth-server.ts:37)
4. `getUser()` builds a server Supabase client from cookies via [`createServerClient()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-auth-server.ts:4)
5. server validates the Supabase session cookie
6. code looks up the local DB user by Supabase user id via Prisma
7. route continues into Prisma and/or `supabaseAdmin`

Examples:

- profile/settings/onboarding: [`src/app/api/user/me/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/user/me/route.ts:9)
- conversations list: [`src/app/api/messages/conversations/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/conversations/route.ts:11)
- dashboard: [`src/app/api/dashboard/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/dashboard/route.ts:9)
- projects/resources/startups/marketplace/study-groups all follow the same pattern

If the server cookie session is stale, missing, or out of sync, `requireAuth()` returns 401 before the business logic runs.

## 2. Messaging Realtime Flow

The messages page mixes API fetches and direct Supabase Realtime subscriptions:

- API fetches load lists and history:
  - [`fetchConversations()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/messages/page.tsx:153)
  - [`fetchMessages()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/messages/page.tsx:199)
  - [`sendMessage()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/messages/page.tsx:369)
- Realtime subscriptions bypass Next API once subscribed:
  - [`supabase.channel(...).on("postgres_changes", ...)`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/messages/page.tsx:223)

So the page already contains the inconsistency:

- initial data and mutations depend on `/api/*`
- live inserts and updates can keep coming through Realtime even if some API requests are failing

## 3. Video Calling Flow

The video calling system is intentionally different:

1. `CallProvider` gets the current user from [`useSupabaseUser()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/components/messaging/call-provider.tsx:51)
2. [`useWebRTCCall()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-webrtc-call.ts:114) uses the plain browser Supabase client from [`src/lib/supabase-client.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-client.ts:45)
3. before channel subscription it reads the browser session and calls [`supabase.realtime.setAuth(session.access_token)`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-webrtc-call.ts:260)
4. it joins private signaling channels like:
   - `calls:user:<userId>` via [`sendToUserChannel()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-webrtc-call.ts:326)
   - `call:<callId>` via [`joinCallChannel()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-webrtc-call.ts:560)
5. signaling happens over Supabase Realtime broadcast
6. media flows directly through `RTCPeerConnection` with ICE servers from [`getIceServers()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/calls/utils.ts:89)

The only server bootstrap calls are:

- create call session: [`src/app/api/messages/calls/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/calls/route.ts:10)
- verify invite: [`src/app/api/messages/calls/verify/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/calls/verify/route.ts:10)
- update/log status: [`src/app/api/messages/calls/[callId]/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/calls/[callId]/route.ts:10) and [`src/app/api/messages/calls/log/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/calls/log/route.ts:22)

After signaling succeeds, the audio/video stream is **browser-to-browser**, not API-to-server.

## Why Video Calling Can Still Work

This is the key reason the behavior looks inconsistent:

- normal product features are mostly `fetch("/api/...")` driven
- video calls use the browser Supabase session directly for signaling
- once the peer connection is established, media traffic bypasses the app backend

So even if the server cookie session is broken, stale, or drifting:

- the browser client can still have a valid token
- Supabase Realtime can still authenticate
- signaling can still work
- the actual video/audio stream can still work

That is exactly the kind of architecture where users report:

> “the app’s API/internet calls are failing, but calling still works”

## Root Cause

## Primary Root Cause: Split Auth State Across Two Different Browser Clients

The app uses two separate browser-side auth/session implementations:

1. Cookie-backed SSR client
   - [`src/lib/supabase-auth-client.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-auth-client.ts:1)
   - used by login/register and [`useSupabaseUser()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-supabase-user.ts:7)
   - backed by `@supabase/ssr` storage

2. Plain Supabase JS client
   - [`src/lib/supabase-client.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-client.ts:1)
   - used by messaging subscriptions, group chat, and WebRTC call signaling
   - explicitly keeps `persistSession: true` and `autoRefreshToken: true`

From the installed package source:

- `createBrowserClient()` in `@supabase/ssr` uses a storage adapter created by `createStorageFromOptions(...)` and PKCE flow
- plain `@supabase/supabase-js` defaults to persistent browser auth state with token auto-refresh

Those two clients are not a single unified source of truth in this codebase.

### Why that breaks API consistency

Server-side auth always depends on cookies:

- [`src/lib/supabase-auth-server.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-auth-server.ts:4)
- [`src/lib/auth-helpers.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/auth-helpers.ts:4)

Realtime/video depends on the browser-side access token:

- [`src/hooks/use-webrtc-call.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-webrtc-call.ts:260)
- [`src/app/(platform)/messages/page.tsx`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/messages/page.tsx:223)
- [`src/components/group-chat.tsx`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/components/group-chat.tsx:108)

So the app can easily land in this state:

- browser Realtime client still has a usable session
- server cookie session is missing, expired, or not refreshed
- `useSupabaseUser()` still makes the UI think the user is logged in
- `/api/*` returns 401 or acts unauthorized
- Realtime subscriptions and video signaling keep working

## Secondary Root Cause: Proxy Explicitly Skips `/api`

[`src/proxy.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/proxy.ts:8) has this early return:

- it skips `/_next`
- it skips `/api`
- it skips `/auth/callback`

That means the request path responsible for server-side session upkeep **does not run for API routes**.

This is a direct problem because every important route handler uses server auth:

- profile/settings/dashboard/routes
- projects/resources/startups/marketplace/study-groups
- messages CRUD
- groups CRUD
- call bootstrap/status routes

If the user session needs cookie refresh while the app is mostly doing client-side navigation and API fetches, the server side can drift stale.

## Tertiary Problem: Frontend Error Handling Hides the Real Failure

A lot of client code ignores bad responses or catches and suppresses errors:

- conversations fetch silently fails: [`src/app/(platform)/messages/page.tsx`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/messages/page.tsx:153)
- message history silently fails: [`src/app/(platform)/messages/page.tsx`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/messages/page.tsx:199)
- group list silently fails: [`src/app/(platform)/messages/page.tsx`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/(platform)/messages/page.tsx:182)
- many other pages assume `.json()` success with minimal status handling

This turns a real 401/403/500 into a vague user report like:

> “the internet/API is broken”

instead of showing the actual backend failure.

## Important Nuance

If **starting a brand new video call from scratch** is definitely working in production, then the failure is probably **not** a total API outage.

Why:

- starting a call still hits [`POST /api/messages/calls`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/calls/route.ts:10)
- that route still uses [`requireAuth()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/calls/route.ts:11)
- it still uses DB-backed peer lookup via [`getConversationPeer()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/messages/calls/utils.ts:51)

So if new calls work reliably, the more likely interpretations are:

1. the failure is intermittent or time-based, caused by session drift
2. only a subset of Prisma-backed endpoints is failing
3. the failing screens are the ones with weak error reporting, while call bootstrap still happens to succeed

## Additional Risks Found During Analysis

## 1. Auth callback swallows DB sync failures

In [`src/app/auth/callback/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/auth/callback/route.ts:166), DB errors are logged and ignored, and the user is still redirected to `/dashboard`.

That can produce:

- browser thinks login succeeded
- server auth cookie exists
- but no matching local DB user exists
- `requireAuth()` returns unauthorized because `db.user.findUnique(...)` returns `null`

This can create another “logged in but APIs fail” state.

## 2. Risky user-id migration logic

The callback route deletes and recreates a user if the email matches but the ID differs:

- [`src/app/auth/callback/route.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/auth/callback/route.ts:110)

That is dangerous in a relational schema with foreign keys because it can orphan or cascade-delete linked data unless handled transactionally and intentionally.

## 3. Database hard dependency at module load

[`src/lib/db.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/db.ts:6) throws immediately if `DATABASE_URL` is missing.

That means any route importing `db` fails before request handling even starts.

## 4. Hybrid data split increases partial-failure risk

The app is effectively split across:

- Prisma/Postgres models
- Supabase tables accessed directly
- Supabase auth
- Supabase Realtime
- GCS

That is workable, but it increases the chance of “one subsystem works, another doesn’t” unless monitoring, contracts, and fallback behavior are much tighter.

## 5. CORS is unlikely to be the main issue

I did not find a custom CORS layer in this app.

That matters because:

- the frontend uses relative same-origin URLs like `fetch("/api/...")`
- same-origin requests do not need custom CORS handling
- WebRTC/STUN/TURN traffic does not explain same-origin API failures

So this does **not** look like a classic CORS bug.

## 6. Build/deployment risk: external font fetch

A local production build attempt failed because `next/font/google` tried to fetch Google Fonts and outbound network was unavailable.

That is not the runtime API bug, but it is a production-readiness concern if builds happen in restricted environments.

## Affected Areas

The failure pattern can impact nearly every non-marketing screen because most pages depend on `/api/*`:

- dashboard
- profile
- settings
- onboarding
- projects
- project detail/create
- knowledge/resources
- marketplace
- startups
- study groups
- topbar UID search
- messages CRUD and group-management APIs

The least affected features are the ones that can continue after a direct Supabase Realtime subscription is established:

- direct-message live inserts
- group-chat live inserts
- WebRTC call signaling
- active peer-to-peer media sessions

## Recommended Fixes

## Priority 1: Unify the Supabase browser client

Use **one** browser client strategy everywhere.

Best practical direction:

- standardize on the `@supabase/ssr` browser client for auth-aware frontend work
- reuse that same client for Realtime and signaling instead of maintaining a separate plain `supabase-js` auth state

Goal:

- one session store
- one token refresh path
- one auth lifecycle
- no cookie/localStorage drift between API auth and Realtime auth

## Priority 2: Stop excluding `/api` from proxy/session refresh coverage

Revisit [`src/proxy.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/proxy.ts:8) and make sure session refresh logic is compatible with API traffic.

At minimum:

- authenticated API requests need a reliable way to keep Supabase cookies fresh
- do not rely on page navigation alone to maintain server auth state

## Priority 3: Make auth truth server-verifiable

Right now `useSupabaseUser()` reads session state client-side via [`getSession()`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-supabase-user.ts:14), which is fine for UI presence but weak as the app’s effective “truth.”

Improve this by:

- adding a lightweight authenticated bootstrap call
- surfacing server auth status in the UI
- redirecting or re-authing when the server says the session is invalid

## Priority 4: Fail loudly and visibly in the frontend

Replace silent `.catch(() => {})` patterns with:

- explicit status handling for `401`, `403`, `500`
- toasts or inline error states
- retry affordances
- auth-expired messaging

Without that, backend failures look random.

## Priority 5: Harden the auth callback

Do not redirect to the product if DB user sync fails.

Instead:

- fail closed
- show a recoverable auth/setup error
- log correlation IDs
- avoid silent “half logged in” states

Also replace delete-and-recreate ID migration logic with a proper migration strategy or a transaction-safe reconciliation flow.

## Priority 6: Add observability

Add structured logs around:

- auth cookie presence
- Supabase `getUser()` failures
- Prisma connection/query failures
- route status codes by endpoint
- call bootstrap failures
- Realtime subscription failures

And track:

- 401 rate by route
- 500 rate by route
- call setup success rate
- message send success rate
- DB connection health

## Priority 7: Normalize the backend architecture

The hybrid Prisma + direct Supabase-table approach is functional but brittle.

For long-term stability, choose a clearer boundary:

- either keep messaging/realtime in Supabase and domain data in Prisma, but formalize the contract
- or bring more of the shared data model under one access layer

At minimum, document which tables are owned by Prisma and which are owned by Supabase scripts.

## Priority 8: Production call hardening

The WebRTC path itself is decent, but for production:

- add TURN everywhere, not just STUN fallbacks
- instrument call bootstrap and ICE failures
- add reconnect telemetry
- make call status/log writes idempotent

## Debugging Playbook

To confirm this in a live environment, I would check in this order:

1. Open the browser network tab and inspect a failing `/api/*` request.
   Look for `401`, `403`, or `500`, not just “failed”.

2. Compare server-auth state vs browser-auth state.
   Use [`/api/debug-auth`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/app/api/debug-auth/route.ts:1) to inspect:
   - whether Supabase cookies exist
   - whether the server sees a session
   - whether the DB user exists

3. Check whether Realtime still has a valid token while `/api/*` is unauthorized.
   That would strongly confirm the split-session diagnosis.

4. If failing routes are mostly dashboard/projects/resources/startups/marketplace/study-groups, verify Prisma migrations and table presence.
   That points to a DB deployment issue rather than pure auth drift.

5. Inspect Supabase logs for auth refresh failures and Realtime channel auth.

6. Inspect deployment env consistency for:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STUN_URLS`
   - `TURN_URLS`
   - `TURN_USERNAME`
   - `TURN_CREDENTIAL`

## Final Conclusion

The application behavior is inconsistent because the codebase currently has **two different communication/auth models**:

- a **server-cookie-authenticated API model** for most business data
- a **browser-token-authenticated Realtime/WebRTC model** for messaging subscriptions and calling

The most likely root cause of “API calls failing while video calling still works” is that those two models are **not kept in sync**.

The exact code points that make this happen are:

- dual browser clients: [`src/lib/supabase-auth-client.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-auth-client.ts:1) and [`src/lib/supabase-client.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-client.ts:1)
- API auth bound to server cookies: [`src/lib/supabase-auth-server.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/supabase-auth-server.ts:4)
- all protected APIs depend on that server auth: [`src/lib/auth-helpers.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/lib/auth-helpers.ts:23)
- Realtime/calls use browser token auth directly: [`src/hooks/use-webrtc-call.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/hooks/use-webrtc-call.ts:260)
- proxy skips `/api`, leaving the API path outside the main session-refresh path: [`src/proxy.ts`](/home/newuser/Desktop/ruhiz/ruhiz7815/src/proxy.ts:8)

If you want the system to be stable and production-ready, the first architectural move should be:

**unify auth/session handling across browser, API, Realtime, and call signaling so the entire app trusts one consistent session state.**
