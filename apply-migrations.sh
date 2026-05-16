#!/bin/bash

# Apply Prisma Migrations to Supabase
# This script will update your Supabase database schema

echo "🚀 Applying Prisma migrations to Supabase..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your DATABASE_URL"
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL" .env.local; then
    echo "❌ Error: DATABASE_URL not found in .env.local"
    echo "Please add your Supabase connection string"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo "✅ Prisma client generated"
echo ""

# Check migration status
echo "🔍 Checking migration status..."
npx prisma migrate status
echo ""

# Apply migrations
echo "🔄 Applying migrations to database..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "❌ Migration failed"
    echo ""
    echo "Try these solutions:"
    echo "1. Check your DATABASE_URL in .env.local"
    echo "2. Make sure you can connect to Supabase"
    echo "3. Try using direct connection URL (port 5432) instead of pooler (port 6543)"
    echo "4. Apply migrations manually via Supabase SQL Editor"
    exit 1
fi

echo "✅ Migrations applied successfully!"
echo ""

# Verify with Prisma Studio
echo "🎉 Success! Your database is now up to date."
echo ""
echo "Next steps:"
echo "1. Run 'npx prisma studio' to verify tables exist"
echo "2. Redeploy your website"
echo "3. Test all features"
echo ""
echo "To open Prisma Studio now, run:"
echo "  npx prisma studio"
