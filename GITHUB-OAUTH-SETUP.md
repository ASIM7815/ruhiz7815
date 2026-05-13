# GitHub OAuth Setup Guide

## Problem
When clicking "Continue with GitHub" on the login page, you get a 500 error and are redirected back to the home page. This happens because GitHub OAuth is not configured in your Supabase project.

## Solution

### Step 1: Create a GitHub OAuth App

1. Go to GitHub Developer Settings:
   - Visit: https://github.com/settings/developers
   - Click "OAuth Apps" → "New OAuth App"

2. Fill in the application details:
   ```
   Application name: RUHIZ
   Homepage URL: https://ruhiz.asimsaadz.com
   Authorization callback URL: https://ybmauetbeakurugikmpb.supabase.co/auth/v1/callback
   ```

3. Click "Register application"

4. **Save these credentials:**
   - Copy the **Client ID**
   - Click "Generate a new client secret"
   - Copy the **Client Secret** (you won't be able to see it again!)

### Step 2: Configure GitHub Provider in Supabase

1. Go to Supabase Auth Providers:
   - Visit: https://supabase.com/dashboard/project/ybmauetbeakurugikmpb/auth/providers

2. Find "GitHub" in the list of providers

3. Toggle it to **Enabled**

4. Enter your GitHub OAuth credentials:
   - **Client ID**: (paste from Step 1)
   - **Client Secret**: (paste from Step 1)

5. Click **Save**

### Step 3: Configure Site URL and Redirect URLs

1. Go to Supabase Auth Settings:
   - Visit: https://supabase.com/dashboard/project/ybmauetbeakurugikmpb/auth/url-configuration

2. Set the **Site URL**:
   ```
   Production: https://ruhiz.asimsaadz.com
   Development: http://localhost:3000
   ```

3. Add **Redirect URLs** (one per line):
   ```
   https://ruhiz.asimsaadz.com/auth/callback
   http://localhost:3000/auth/callback
   ```

4. Click **Save**

### Step 4: Test the Integration

#### Local Development:
```bash
npm run dev
```
Then visit: http://localhost:3000/login

#### Production:
Visit: https://ruhiz.asimsaadz.com/login

Click "Continue with GitHub" and you should:
1. Be redirected to GitHub
2. See an authorization prompt
3. Be redirected back to your app
4. Be logged in successfully

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the callback URL in GitHub OAuth app matches exactly:
  `https://ybmauetbeakurugikmpb.supabase.co/auth/v1/callback`
- Check that redirect URLs are added in Supabase Auth Settings

### Error: "Invalid client credentials"
- Double-check the Client ID and Client Secret in Supabase
- Make sure you copied them correctly (no extra spaces)

### Still redirecting to home page with no error:
- Check browser console for errors
- Check Supabase logs: https://supabase.com/dashboard/project/ybmauetbeakurugikmpb/logs/explorer
- Make sure GitHub provider is enabled in Supabase

### User created but not syncing to database:
- Check the `/auth/callback` route logs
- Verify DATABASE_URL is correct in environment variables
- Check Prisma schema matches your database

## Current Status

✅ Google OAuth - Configured and working
⏳ GitHub OAuth - Needs configuration (button temporarily disabled)

## Re-enabling GitHub Login

Once you've completed the setup above, uncomment the GitHub login button in:
`src/app/(auth)/login/page.tsx`

Look for the commented section:
```tsx
{/* GitHub login temporarily disabled - configure in Supabase Dashboard to enable */}
```

## Additional Resources

- [Supabase GitHub OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Supabase Auth Configuration](https://supabase.com/dashboard/project/ybmauetbeakurugikmpb/auth/providers)

## Summary

The issue was that GitHub OAuth provider was not configured in Supabase. Follow the steps above to:
1. Create a GitHub OAuth app
2. Configure it in Supabase
3. Set up redirect URLs
4. Test the integration

After setup, users will be able to log in with GitHub! 🚀
