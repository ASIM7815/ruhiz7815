#!/bin/bash

# Script to add runtime directives to all API routes
# This fixes Vercel deployment issues with Edge runtime

echo "🔧 Fixing API routes for Vercel deployment..."
echo ""

# Find all route.ts files in src/app/api
routes=$(find src/app/api -name "route.ts" -type f)

count=0
for file in $routes; do
  # Check if file already has runtime directive
  if grep -q "export const runtime" "$file"; then
    echo "⏭️  Skipping $file (already has runtime directive)"
  else
    echo "✏️  Updating $file"
    
    # Create temp file with runtime directive after imports
    {
      # Add runtime directives after the last import
      awk '
        /^import/ { imports = imports $0 "\n"; next }
        !added && !/^import/ && !/^$/ { 
          print imports
          print "export const runtime = \"nodejs\";"
          print "export const dynamic = \"force-dynamic\";"
          print ""
          added = 1
        }
        { print }
      ' "$file"
    } > "$file.tmp"
    
    # Replace original file
    mv "$file.tmp" "$file"
    ((count++))
  fi
done

echo ""
echo "✅ Updated $count API route files"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff"
echo "2. Test locally: npm run build"
echo "3. Commit: git add . && git commit -m 'Fix: Add runtime directives for Vercel'"
echo "4. Deploy: git push origin main"
