#!/bin/bash

# Fix all remaining error variable conflicts

files=(
  "src/app/api/groups/[id]/leave/route.ts"
  "src/app/api/groups/[id]/members/[userId]/route.ts"
  "src/app/api/groups/[id]/members/route.ts"
  "src/app/api/groups/[id]/messages/route.ts"
  "src/app/api/groups/[id]/route.ts"
  "src/app/api/messages/[id]/react/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing: $file"
    # Replace Supabase error destructuring
    sed -i 's/const { data: \([^,]*\), error } = await supabaseAdmin/const { data: \1, error: dbError } = await supabaseAdmin/g' "$file"
    sed -i 's/const { error } = await supabaseAdmin/const { error: dbError } = await supabaseAdmin/g' "$file"
    # Update error references
    sed -i 's/if (error)/if (dbError)/g' "$file"
    sed -i 's/return.*{ error }/return NextResponse.json({ error: dbError }/g' "$file"
  fi
done

echo "Done!"
