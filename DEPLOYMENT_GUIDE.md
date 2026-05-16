# RUHIZ Deployment Guide

Complete guide for deploying RUHIZ to production.

---

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase recommended)
- Google Cloud Storage bucket
- Vercel account (or other hosting platform)
- Domain name (optional)

---

## 🗄️ Database Setup

### 1. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Note your project URL and keys
3. Run the SQL scripts in order:

```bash
# Auth tables (if not already done)
psql -h <host> -U postgres -d postgres -f supabase-auth-tables.sql

# Group messaging tables
psql -h <host> -U postgres -d postgres -f supabase-setup-complete.sql
```

### 2. Prisma Migration

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name initial_setup

# Or apply existing migrations
npx prisma migrate deploy
```

### 3. Verify Database

```bash
# Open Prisma Studio to verify
npx prisma studio
```

**Check that these tables exist:**
- users
- projects
- project_members
- join_requests
- notifications
- reports
- audit_logs
- file_assets
- listings
- And all other models from schema.prisma

---

## ☁️ Google Cloud Storage Setup

### 1. Create GCS Bucket

```bash
# Using gcloud CLI
gcloud storage buckets create gs://ruhiz-uploads \
  --location=us-central1 \
  --uniform-bucket-level-access

# Set CORS policy
gcloud storage buckets update gs://ruhiz-uploads \
  --cors-file=gcs-cors.json
```

### 2. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create ruhiz-uploader \
  --display-name="RUHIZ File Uploader"

# Grant permissions
gcloud storage buckets add-iam-policy-binding gs://ruhiz-uploads \
  --member="serviceAccount:ruhiz-uploader@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Create key
gcloud iam service-accounts keys create googlebucket.json \
  --iam-account=ruhiz-uploader@PROJECT_ID.iam.gserviceaccount.com
```

### 3. CORS Configuration (gcs-cors.json)

```json
[
  {
    "origin": ["https://yourdomain.com", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

---

## 🔐 Environment Variables

### Required Variables

Create `.env.production` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Google Cloud Storage
GCS_PROJECT_ID="your-project-id"
GCS_BUCKET_NAME="ruhiz-uploads"
GCS_CREDENTIALS_PATH="./googlebucket.json"

# Or use base64 encoded credentials
GCS_CREDENTIALS_BASE64="base64-encoded-json"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"
```

### Vercel Environment Variables

In Vercel dashboard, add:

1. **Database:**
   - `DATABASE_URL` (sensitive)

2. **Supabase:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (sensitive)

3. **Google Cloud Storage:**
   - `GCS_PROJECT_ID`
   - `GCS_BUCKET_NAME`
   - `GCS_CREDENTIALS_BASE64` (sensitive)
   - Convert JSON to base64: `cat googlebucket.json | base64`

4. **App:**
   - `NEXT_PUBLIC_APP_URL`

---

## 🚀 Vercel Deployment

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Link Project

```bash
vercel link
```

### 3. Set Environment Variables

```bash
# Set production variables
vercel env add DATABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GCS_CREDENTIALS_BASE64 production
# ... add all other variables
```

### 4. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 5. Configure Domain

```bash
vercel domains add yourdomain.com
```

---

## 🔧 Build Configuration

### vercel.json

```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  }
}
```

---

## 🔒 Security Checklist

### Before Deployment:

- [ ] All environment variables set
- [ ] Service role keys are marked as sensitive
- [ ] GCS bucket has proper CORS configuration
- [ ] Database has SSL enabled
- [ ] Supabase RLS policies configured
- [ ] No hardcoded secrets in code
- [ ] `.env.local` in `.gitignore`
- [ ] `googlebucket.json` in `.gitignore`

### After Deployment:

- [ ] Test authentication flow
- [ ] Test file uploads
- [ ] Test project creation
- [ ] Test join request flow
- [ ] Test admin panel access
- [ ] Verify HTTPS is working
- [ ] Check error logging
- [ ] Monitor performance

---

## 📊 Database Migrations in Production

### Safe Migration Process:

1. **Backup Database:**
```bash
pg_dump -h <host> -U postgres -d database > backup.sql
```

2. **Test Migration Locally:**
```bash
# On local copy of production data
npx prisma migrate dev
```

3. **Deploy Migration:**
```bash
# In production environment
npx prisma migrate deploy
```

4. **Verify:**
```bash
npx prisma studio
```

### Rollback Plan:

```bash
# Restore from backup if needed
psql -h <host> -U postgres -d database < backup.sql
```

---

## 🔍 Monitoring & Logging

### Vercel Logs

```bash
# View real-time logs
vercel logs --follow

# View specific deployment
vercel logs <deployment-url>
```

### Error Tracking

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Vercel Analytics for performance

### Database Monitoring

- Enable Supabase monitoring
- Set up alerts for:
  - High connection count
  - Slow queries
  - Storage usage

---

## 🚨 Common Issues & Solutions

### Issue: Prisma Client Not Found

**Solution:**
```bash
# Add postinstall script
"postinstall": "prisma generate"
```

### Issue: GCS Upload Fails

**Solution:**
- Verify credentials are base64 encoded correctly
- Check bucket permissions
- Verify CORS configuration
- Check bucket name matches environment variable

### Issue: Database Connection Timeout

**Solution:**
- Enable connection pooling
- Use Supabase connection pooler URL
- Increase timeout in Prisma schema:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Issue: Build Fails on Vercel

**Solution:**
- Check build logs for specific error
- Verify all dependencies in package.json
- Ensure Node.js version matches (18+)
- Check for TypeScript errors: `npx tsc --noEmit`

### Issue: Admin Panel Not Accessible

**Solution:**
- Verify user has `platformRole = "ADMIN"` in database
- Check authentication is working
- Verify middleware is not blocking admin routes

---

## 📈 Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_file_assets_entity ON file_assets(entity_type, entity_id);
```

### 2. Caching Strategy

- Use Vercel Edge Caching for static assets
- Implement Redis for session caching (optional)
- Use SWR for client-side data fetching

### 3. Image Optimization

- Use Next.js Image component
- Serve images from GCS with CDN
- Implement lazy loading

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 📱 Mobile Considerations

### PWA Setup

Add to `next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  // your config
});
```

### Responsive Testing

Test on:
- Mobile browsers (iOS Safari, Chrome)
- Tablet devices
- Desktop browsers
- Different screen sizes

---

## 🧪 Pre-Deployment Testing

### Checklist:

- [ ] Run full test suite: `npm test`
- [ ] Check TypeScript: `npx tsc --noEmit`
- [ ] Run linter: `npm run lint`
- [ ] Test build locally: `npm run build && npm start`
- [ ] Test all critical user flows
- [ ] Verify environment variables
- [ ] Check database migrations
- [ ] Test file uploads
- [ ] Verify authentication
- [ ] Test admin panel

---

## 📞 Support & Maintenance

### Regular Maintenance:

1. **Weekly:**
   - Check error logs
   - Monitor performance metrics
   - Review user reports

2. **Monthly:**
   - Update dependencies
   - Review security advisories
   - Backup database
   - Clean up old files

3. **Quarterly:**
   - Performance audit
   - Security audit
   - User feedback review

### Backup Strategy:

```bash
# Automated daily backups
0 2 * * * pg_dump -h <host> -U postgres -d database > backup-$(date +\%Y\%m\%d).sql

# Keep last 30 days
find /backups -name "backup-*.sql" -mtime +30 -delete
```

---

## 🎯 Post-Deployment Checklist

- [ ] Verify all pages load correctly
- [ ] Test authentication (login/logout/register)
- [ ] Test project creation and group auto-creation
- [ ] Test join request flow
- [ ] Test file uploads to GCS
- [ ] Test notifications
- [ ] Test admin panel
- [ ] Verify email notifications (if configured)
- [ ] Check mobile responsiveness
- [ ] Test marketplace functionality
- [ ] Verify all API endpoints
- [ ] Check error pages (404, 500)
- [ ] Test real-time features (chat, notifications)
- [ ] Monitor initial performance metrics
- [ ] Set up error alerting
- [ ] Document any issues found

---

## 🚀 Going Live

### Final Steps:

1. **DNS Configuration:**
   - Point domain to Vercel
   - Wait for DNS propagation (up to 48 hours)
   - Verify SSL certificate is active

2. **Announcement:**
   - Prepare launch announcement
   - Test with small group first
   - Monitor closely for first 24 hours

3. **Monitoring:**
   - Set up uptime monitoring
   - Configure error alerts
   - Monitor user feedback

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Production URL**: _____________
**Status**: ✅ Ready for Production
