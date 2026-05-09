#!/bin/bash

# Fix all API routes to add !user check after requireAuth

files=(
  "src/app/api/study-groups/route.ts"
  "src/app/api/resources/route.ts"
  "src/app/api/upload/route.ts"
  "src/app/api/study-groups/[id]/join/route.ts"
  "src/app/api/resources/[id]/route.ts"
  "src/app/api/study-groups/[id]/join/[requestId]/route.ts"
  "src/app/api/messages/conversations/route.ts"
  "src/app/api/messages/[id]/react/route.ts"
  "src/app/api/messages/conversations/[id]/route.ts"
  "src/app/api/groups/route.ts"
  "src/app/api/startups/route.ts"
  "src/app/api/groups/[id]/leave/route.ts"
  "src/app/api/messages/[id]/read/route.ts"
  "src/app/api/messages/send/route.ts"
  "src/app/api/groups/[id]/messages/route.ts"
  "src/app/api/projects/route.ts"
  "src/app/api/startups/[id]/join/route.ts"
  "src/app/api/groups/[id]/route.ts"
  "src/app/api/startups/[id]/join/[requestId]/route.ts"
  "src/app/api/user/me/route.ts"
  "src/app/api/groups/[id]/members/route.ts"
  "src/app/api/projects/[projectId]/join/route.ts"
  "src/app/api/marketplace/route.ts"
  "src/app/api/marketplace/[id]/route.ts"
  "src/app/api/groups/[id]/members/[userId]/route.ts"
  "src/app/api/user/me/avatar/route.ts"
  "src/app/api/marketplace/[id]/contact/route.ts"
  "src/app/api/projects/[projectId]/join/[requestId]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Replace "if (error) {" with "if (error || !user) {" for standard pattern
    sed -i 's/if (error) {$/if (error || !user) {/g' "$file"
    # Also handle the authUser pattern
    sed -i 's/if (error || !user || !user) {/if (error || !user) {/g' "$file"
  fi
done

echo "Done!"
