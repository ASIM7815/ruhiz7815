#!/bin/bash

# Script to migrate all API routes from NextAuth to Supabase Auth

echo "🔄 Migrating API routes from NextAuth to Supabase Auth..."
echo ""

# Find all route.ts files in src/app/api
routes=$(find src/app/api -name "route.ts" -type f)

count=0
for file in $routes; do
  # Check if file imports from @/lib/auth
  if grep -q "from '@/lib/auth'" "$file" 2>/dev/null; then
    echo "📝 Updating: $file"
    
    # Replace the import
    sed -i "s|import { auth } from '@/lib/auth';|import { requireAuth } from '@/lib/auth-helpers';|g" "$file"
    
    # Replace auth() calls with requireAuth()
    sed -i 's/const session = await auth();/const { user, error, status } = await requireAuth();/g' "$file"
    sed -i 's/if (!session?.user?.id)/if (error)/g' "$file"
    sed -i 's/session\.user\.id/user.id/g' "$file"
    sed -i 's/session\.user/user/g' "$file"
    
    ((count++))
  fi
done

echo ""
echo "✅ Updated $count API route files"
echo ""
echo "⚠️  Note: Some files may need manual review for complex auth logic"
