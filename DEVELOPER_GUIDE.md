# RUHIZ Developer Guide

Quick start guide for developers working on RUHIZ.

---

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd ruhiz
npm install
```

### 2. Environment Setup

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your credentials:
```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
GCS_PROJECT_ID="..."
GCS_BUCKET_NAME="..."
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## 📁 Project Structure

```
ruhiz/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app/                   # Next.js app router
│   │   ├── (auth)/           # Auth pages
│   │   ├── (marketing)/      # Public pages
│   │   ├── (platform)/       # Protected pages
│   │   ├── admin/            # Admin panel
│   │   └── api/              # API routes
│   ├── components/           # React components
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                  # Utilities
│   │   ├── services/        # Business logic
│   │   ├── auth-helpers.ts  # Auth utilities
│   │   ├── db.ts            # Prisma client
│   │   ├── gcs.ts           # Google Cloud Storage
│   │   └── supabase-*.ts    # Supabase clients
│   └── proxy.ts             # Middleware
├── public/                   # Static assets
└── package.json
```

---

## 🏗️ Architecture Overview

### Tech Stack

- **Framework**: Next.js 16.2.3 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **Storage**: Google Cloud Storage
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Real-time**: Supabase Realtime

### Key Concepts

1. **Route Groups**: Organize pages by access level
   - `(auth)`: Login, register
   - `(marketing)`: Public pages
   - `(platform)`: Protected pages
   - `admin`: Admin-only pages

2. **API Routes**: Server-side endpoints in `app/api/`
   - All use `export const runtime = "nodejs"`
   - All use `export const dynamic = "force-dynamic"`

3. **Services**: Business logic in `src/lib/services/`
   - `permissions.ts`: Permission checks
   - `notifications.ts`: Notification creation
   - `project-groups.ts`: Group management

4. **Middleware**: `src/proxy.ts` handles auth redirects

---

## 🔐 Authentication Flow

### Server-Side Auth

```typescript
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Your logic here
}
```

### Client-Side Auth

```typescript
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export default function MyComponent() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);
}
```

---

## 🗄️ Database Operations

### Using Prisma

```typescript
import { db } from "@/lib/db";

// Create
const project = await db.project.create({
  data: {
    title: "My Project",
    ownerId: user.id,
  },
});

// Read
const projects = await db.project.findMany({
  where: { status: "OPEN" },
  include: { owner: true },
});

// Update
await db.project.update({
  where: { id: projectId },
  data: { status: "IN_PROGRESS" },
});

// Delete
await db.project.delete({
  where: { id: projectId },
});
```

### Transactions

```typescript
await db.$transaction([
  db.joinRequest.update({
    where: { id: requestId },
    data: { status: "ACCEPTED" },
  }),
  db.projectMember.create({
    data: { projectId, userId, role: "MEMBER" },
  }),
]);
```

---

## 📝 Creating New Features

### 1. Add Database Model

Edit `prisma/schema.prisma`:

```prisma
model MyModel {
  id        String   @id @default(cuid())
  name      String
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("my_models")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_my_model
```

### 2. Create API Route

Create `src/app/api/my-route/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const items = await db.myModel.findMany({
    where: { userId: user.id },
  });
  
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { name } = body;
  
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  
  const item = await db.myModel.create({
    data: { name, userId: user.id },
  });
  
  return NextResponse.json({ id: item.id }, { status: 201 });
}
```

### 3. Create Page Component

Create `src/app/(platform)/my-page/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MyPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadItems();
  }, []);
  
  async function loadItems() {
    const res = await fetch("/api/my-route");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
    setLoading(false);
  }
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>My Page</h1>
      {items.map((item) => (
        <Card key={item.id}>{item.name}</Card>
      ))}
    </div>
  );
}
```

---

## 🎨 UI Components

### Using shadcn/ui

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Enter text" />
        <Button>Submit</Button>
        <Badge>New</Badge>
      </CardContent>
    </Card>
  );
}
```

### Adding New Components

```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
```

---

## 🔒 Permission Checks

### Using Permission Helpers

```typescript
import { 
  isProjectAdminRole,
  isPlatformAdmin,
  canAccessMarketplace,
  canCreateMarketplaceListing 
} from "@/lib/services/permissions";

// Check project admin
if (!isProjectAdminRole(member.role)) {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

// Check platform admin
if (!isPlatformAdmin(user)) {
  return NextResponse.json({ error: "Platform admin required" }, { status: 403 });
}

// Check marketplace access
if (!canAccessMarketplace(user)) {
  return NextResponse.json({ error: "Marketplace access denied" }, { status: 403 });
}
```

### Creating New Permission Helpers

Add to `src/lib/services/permissions.ts`:

```typescript
export function canDoSomething(user: PermissionUser, resource: Resource) {
  if (isPlatformAdmin(user)) return true;
  if (resource.ownerId === user.id) return true;
  return false;
}
```

---

## 📤 File Uploads

### Upload Flow

```typescript
// Client-side
const formData = new FormData();
formData.append("file", file);
formData.append("type", "project");
formData.append("entityId", projectId);

const res = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});

const { id, url } = await res.json();
```

### Server-side Validation

File uploads automatically:
- Check file size limits
- Verify file types
- Check entity permissions
- Save metadata to database
- Upload to GCS

---

## 🔔 Notifications

### Creating Notifications

```typescript
import { createNotification } from "@/lib/services/notifications";

await createNotification({
  userId: targetUserId,
  type: "PROJECT_JOIN_REQUEST_CREATED",
  title: "New join request",
  message: `${user.name} requested to join "${project.title}"`,
  link: `/projects/${projectId}/requests`,
  actorId: user.id,
  entityType: "PROJECT",
  entityId: projectId,
});
```

### Notification Types

- `PROJECT_JOIN_REQUEST_CREATED`
- `PROJECT_JOIN_REQUEST_APPROVED`
- `PROJECT_JOIN_REQUEST_REJECTED`
- `PROJECT_MEMBER_REMOVED`
- `PROJECT_ROLE_CHANGED`

Add new types as needed.

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.ts

# Run with coverage
npm test -- --coverage
```

### Writing Tests

```typescript
import { describe, it, expect } from "vitest";
import { isProjectAdminRole } from "@/lib/services/permissions";

describe("Permission Helpers", () => {
  it("should identify admin roles", () => {
    expect(isProjectAdminRole("ADMIN")).toBe(true);
    expect(isProjectAdminRole("LEADER")).toBe(true);
    expect(isProjectAdminRole("MEMBER")).toBe(false);
  });
});
```

---

## 🐛 Debugging

### Server-Side Debugging

Add console logs in API routes:

```typescript
console.log("[my-route] User:", user.id);
console.log("[my-route] Request body:", body);
```

View logs:
```bash
# Development
# Logs appear in terminal

# Production (Vercel)
vercel logs --follow
```

### Client-Side Debugging

Use React DevTools and browser console:

```typescript
console.log("State:", state);
console.error("Error:", error);
```

### Database Debugging

```bash
# View database in Prisma Studio
npx prisma studio

# Check query logs
# Add to schema.prisma:
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}
```

---

## 📊 Common Patterns

### Pagination

```typescript
const cursor = searchParams.get("cursor");
const take = 20;

const items = await db.myModel.findMany({
  take: take + 1,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  orderBy: { createdAt: "desc" },
});

const hasMore = items.length > take;
const results = hasMore ? items.slice(0, take) : items;

return NextResponse.json({
  items: results,
  nextCursor: hasMore ? results[results.length - 1].id : null,
});
```

### Error Handling

```typescript
try {
  // Your logic
} catch (error) {
  console.error("[route-name] Error:", error);
  return NextResponse.json(
    { error: "Something went wrong" },
    { status: 500 }
  );
}
```

### Audit Logging

```typescript
await db.auditLog.create({
  data: {
    actorId: user.id,
    action: "USER_UPDATED",
    entityType: "USER",
    entityId: targetUserId,
    metadata: JSON.stringify({ changes }),
  },
});
```

---

## 🔧 Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint

# Database
npx prisma studio              # Open database GUI
npx prisma generate            # Generate Prisma client
npx prisma migrate dev         # Create and apply migration
npx prisma migrate deploy      # Apply migrations (production)
npx prisma db push             # Push schema without migration
npx prisma db seed             # Seed database

# TypeScript
npx tsc --noEmit              # Check types without building

# Vercel
vercel                         # Deploy to preview
vercel --prod                  # Deploy to production
vercel logs --follow           # View logs
vercel env ls                  # List environment variables
```

---

## 📚 Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

### Internal Docs
- `FULL_WEBSITE_ARCHITECTURE.md` - Complete architecture
- `API_REFERENCE.md` - API documentation
- `IMPLEMENTATION_COMPLETE.md` - Implementation status
- `DEPLOYMENT_GUIDE.md` - Deployment instructions

---

## 🤝 Contributing

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex logic
- Use meaningful variable names
- Keep functions small and focused

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push and create PR
git push origin feature/my-feature
```

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

---

## 🚨 Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually reset
npx prisma db push --force-reset
```

### Type Errors

```bash
# Regenerate Prisma types
npx prisma generate

# Check for errors
npx tsc --noEmit
```

---

## 💡 Tips & Best Practices

1. **Always use server-side auth checks** - Never trust client-side checks
2. **Use transactions for related operations** - Prevent inconsistent state
3. **Add proper error handling** - Log errors and return user-friendly messages
4. **Validate input** - Check all user input on the server
5. **Use TypeScript** - Catch errors at compile time
6. **Keep API routes simple** - Move business logic to services
7. **Test permission checks** - Verify access control works
8. **Document complex logic** - Help future developers understand
9. **Use meaningful names** - Make code self-documenting
10. **Follow existing patterns** - Maintain consistency

---

**Happy Coding! 🚀**

For questions or issues, check the documentation or ask the team.
