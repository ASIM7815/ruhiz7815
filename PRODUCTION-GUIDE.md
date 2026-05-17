# RUHIZ Production Guide

## Overview
This guide covers production deployment, monitoring, and maintenance for RUHIZ.

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Performance Monitoring](#performance-monitoring)
3. [Error Tracking](#error-tracking)
4. [Analytics](#analytics)
5. [Rate Limiting](#rate-limiting)
6. [SEO](#seo)
7. [Security](#security)
8. [Backup Strategy](#backup-strategy)
9. [Health Checks](#health-checks)

---

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Google Cloud Storage
GCS_PROJECT_ID="..."
GCS_BUCKET_NAME="..."
GCS_CLIENT_EMAIL="..."
GCS_PRIVATE_KEY="..."

# Application
NEXT_PUBLIC_APP_URL="https://ruhiz.com"

# Optional: SEO
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION="..."

# Optional: Error Tracking (Sentry)
NEXT_PUBLIC_SENTRY_DSN="..."
SENTRY_AUTH_TOKEN="..."

# Optional: Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY="..."
NEXT_PUBLIC_POSTHOG_HOST="..."
```

---

## Performance Monitoring

### Built-in Performance Utilities

The application includes performance monitoring utilities in `src/lib/performance.ts`:

```typescript
import { reportWebVitals, measurePageLoad } from '@/lib/performance';

// Track Core Web Vitals
reportWebVitals(metric);

// Measure page load times
measurePageLoad();
```

### Recommended Services

1. **Vercel Analytics** (if deployed on Vercel)
   - Automatic Core Web Vitals tracking
   - Real User Monitoring (RUM)
   - No configuration needed

2. **PostHog** (recommended for self-hosted)
   ```bash
   npm install posthog-js
   ```
   - Session replay
   - Performance monitoring
   - Feature flags

3. **Lighthouse CI**
   ```bash
   npm install -g @lhci/cli
   lhci autorun
   ```

### Performance Targets

- **Lighthouse Score**: > 90 for all metrics
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Cumulative Layout Shift (CLS)**: < 0.1

---

## Error Tracking

### Sentry Integration (Recommended)

1. **Install Sentry**
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

2. **Configure Sentry**
   The wizard will create:
   - `sentry.client.config.ts`
   - `sentry.server.config.ts`
   - `sentry.edge.config.ts`

3. **Update Error Handlers**
   
   In `src/app/error.tsx`:
   ```typescript
   import * as Sentry from '@sentry/nextjs';
   
   useEffect(() => {
     Sentry.captureException(error);
   }, [error]);
   ```

   In `src/lib/monitoring.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs';
   
   export function logError(error: Error, context?: Record<string, unknown>) {
     Sentry.captureException(error, { extra: context });
   }
   ```

### Error Monitoring Checklist

- [ ] Set up Sentry project
- [ ] Configure source maps upload
- [ ] Set up error alerts (Slack, email)
- [ ] Configure release tracking
- [ ] Set up performance monitoring
- [ ] Configure user feedback widget

---

## Analytics

### PostHog Integration (Recommended)

1. **Install PostHog**
   ```bash
   npm install posthog-js
   ```

2. **Initialize PostHog**
   
   Create `src/lib/posthog.ts`:
   ```typescript
   import posthog from 'posthog-js';
   
   if (typeof window !== 'undefined') {
     posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
       api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
       loaded: (posthog) => {
         if (process.env.NODE_ENV === 'development') posthog.debug();
       },
     });
   }
   
   export default posthog;
   ```

3. **Track Events**
   ```typescript
   import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
   
   trackEvent({
     name: AnalyticsEvents.PROJECT_CREATED,
     properties: { project_id: '123' }
   });
   ```

### Alternative: Plausible Analytics

For privacy-focused analytics:

```html
<!-- Add to src/app/layout.tsx -->
<script defer data-domain="ruhiz.com" src="https://plausible.io/js/script.js"></script>
```

---

## Rate Limiting

### In-Memory Rate Limiting (Current)

The application includes basic in-memory rate limiting in `src/lib/rate-limit.ts`.

**Limitations:**
- Not suitable for multi-instance deployments
- Resets on server restart

### Production: Upstash Redis

1. **Install Upstash**
   ```bash
   npm install @upstash/redis @upstash/ratelimit
   ```

2. **Configure Upstash**
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';
   
   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });
   
   export const ratelimit = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(10, '10 s'),
   });
   ```

3. **Apply to API Routes**
   ```typescript
   const { success } = await ratelimit.limit(userId);
   if (!success) {
     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
   }
   ```

---

## SEO

### Implemented Features

✅ **Meta Tags** - Comprehensive meta tags in `src/app/layout.tsx`  
✅ **Open Graph** - OG tags for social sharing  
✅ **Twitter Cards** - Twitter-specific meta tags  
✅ **Sitemap** - Dynamic sitemap at `/sitemap.xml`  
✅ **Robots.txt** - Robots configuration at `/robots.txt`  
✅ **Structured Data** - Ready for JSON-LD implementation

### Next Steps

1. **Create OG Image**
   - Create `public/og-image.png` (1200x630px)
   - Use tools like [og-image.vercel.app](https://og-image.vercel.app)

2. **Add Structured Data**
   ```typescript
   // In page components
   export const metadata = {
     ...
     other: {
       'application/ld+json': JSON.stringify({
         '@context': 'https://schema.org',
         '@type': 'WebApplication',
         name: 'RUHIZ',
         description: '...',
       }),
     },
   };
   ```

3. **Submit to Search Engines**
   - Google Search Console
   - Bing Webmaster Tools
   - Submit sitemap: `https://ruhiz.com/sitemap.xml`

---

## Security

### Implemented Security Headers

✅ **HSTS** - Strict-Transport-Security  
✅ **X-Frame-Options** - Clickjacking protection  
✅ **X-Content-Type-Options** - MIME sniffing protection  
✅ **X-XSS-Protection** - XSS filter  
✅ **Referrer-Policy** - Referrer information control  
✅ **Permissions-Policy** - Feature policy

### Security Checklist

- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Configure CSP (Content Security Policy)
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable DDoS protection
- [ ] Configure CORS properly
- [ ] Implement API authentication
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning

### Recommended Tools

- **Snyk** - Dependency vulnerability scanning
- **OWASP ZAP** - Security testing
- **npm audit** - Built-in vulnerability checker

---

## Backup Strategy

### Database Backups (PostgreSQL)

1. **Automated Backups**
   - Enable automated backups on your database provider
   - Recommended: Daily backups with 30-day retention

2. **Manual Backup**
   ```bash
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

3. **Restore**
   ```bash
   psql $DATABASE_URL < backup-20260517.sql
   ```

### Supabase Backups

- Supabase Pro includes daily backups
- Export data via Supabase Dashboard
- Use Supabase CLI for programmatic backups

### GCS Backups

1. **Enable Versioning**
   ```bash
   gsutil versioning set on gs://your-bucket
   ```

2. **Set Lifecycle Rules**
   - Keep versions for 30 days
   - Archive old versions to Coldline storage

---

## Health Checks

### Built-in Health Check

The application includes a health check endpoint at `/api/health`:

```bash
curl https://ruhiz.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-17T12:00:00.000Z",
  "checks": {
    "database": true,
    "env": true
  },
  "version": "1.0.0"
}
```

### Monitoring Services

1. **Uptime Monitoring**
   - [UptimeRobot](https://uptimerobot.com) (free)
   - [Pingdom](https://www.pingdom.com)
   - [Better Uptime](https://betteruptime.com)

2. **Configure Alerts**
   - Email notifications
   - Slack integration
   - PagerDuty for critical issues

3. **Monitor Endpoints**
   - `/api/health` - Overall health
   - `/` - Homepage availability
   - `/api/projects` - API availability

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run `npm run build` locally
- [ ] Run `npm run lint`
- [ ] Run tests (if available)
- [ ] Check environment variables
- [ ] Review security headers
- [ ] Test database migrations
- [ ] Verify GCS connectivity

### Post-Deployment

- [ ] Verify health check endpoint
- [ ] Test critical user flows
- [ ] Check error tracking
- [ ] Verify analytics tracking
- [ ] Test rate limiting
- [ ] Check performance metrics
- [ ] Submit sitemap to search engines
- [ ] Set up monitoring alerts

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates
- Check performance metrics
- Review user feedback

**Weekly:**
- Review analytics data
- Check backup status
- Update dependencies (security patches)

**Monthly:**
- Full security audit
- Performance optimization review
- Database maintenance
- Cost optimization review

---

## Support & Resources

- **Documentation**: [Next.js Docs](https://nextjs.org/docs)
- **Deployment**: [Vercel Docs](https://vercel.com/docs)
- **Database**: [Prisma Docs](https://www.prisma.io/docs)
- **Storage**: [Supabase Docs](https://supabase.com/docs)

---

**Last Updated**: May 17, 2026  
**Version**: 1.0.0
