#!/usr/bin/env python3
import os
import re

files_to_update = [
    "src/app/api/resources/route.ts",
    "src/app/api/upload/route.ts",
    "src/app/api/study-groups/route.ts",
    "src/app/api/groups/[id]/route.ts",
    "src/app/api/messages/calls/route.ts",
    "src/app/api/resources/[id]/route.ts",
    "src/app/api/study-groups/[id]/join/route.ts",
    "src/app/api/groups/route.ts",
    "src/app/api/messages/calls/log/route.ts",
    "src/app/api/groups/[id]/messages/route.ts",
    "src/app/api/messages/calls/verify/route.ts",
    "src/app/api/messages/[id]/react/route.ts",
    "src/app/api/messages/[id]/read/route.ts",
    "src/app/api/study-groups/[id]/join/[requestId]/route.ts",
    "src/app/api/groups/[id]/leave/route.ts",
    "src/app/api/groups/[id]/members/[userId]/route.ts",
    "src/app/api/startups/route.ts",
    "src/app/api/messages/send/route.ts",
    "src/app/api/marketplace/route.ts",
    "src/app/api/groups/[id]/members/route.ts",
    "src/app/api/projects/[projectId]/join/route.ts",
    "src/app/api/marketplace/[id]/route.ts",
    "src/app/api/messages/conversations/[id]/route.ts",
    "src/app/api/projects/[projectId]/join/[requestId]/route.ts",
    "src/app/api/marketplace/[id]/contact/route.ts",
    "src/app/api/messages/conversations/route.ts",
    "src/app/api/projects/route.ts",
    "src/app/api/user/me/avatar/route.ts",
    "src/app/api/startups/[id]/join/route.ts",
    "src/app/api/startups/[id]/join/[requestId]/route.ts",
    "src/app/api/user/me/route.ts",
]

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace import
    content = content.replace(
        'import { auth } from "@/lib/auth";',
        'import { requireAuth } from "@/lib/auth-helpers";'
    )
    
    # Replace auth() call pattern 1: const session = await auth();
    content = re.sub(
        r'const session = await auth\(\);',
        'const { user, error, status } = await requireAuth();',
        content
    )
    
    # Replace error check pattern 1: if (!session?.user?.id)
    content = re.sub(
        r'if \(!session\?\.user\?\.id\) \{[\s\S]*?return.*?\}',
        lambda m: m.group(0).replace(
            'if (!session?.user?.id)',
            'if (error)'
        ).replace(
            'return NextResponse.json({ error: "Unauthorized" }, { status: 401 });',
            'return NextResponse.json({ error }, { status });'
        ).replace(
            'return Response.json({ error: "Unauthorized" }, { status: 401 });',
            'return Response.json({ error }, { status });'
        ),
        content
    )
    
    # Replace session.user.id with user.id
    content = re.sub(r'session\.user\.id', 'user.id', content)
    content = re.sub(r'session\.user\.name', 'user.name', content)
    content = re.sub(r'session\.user\.email', 'user.email', content)
    content = re.sub(r'session\.user', 'user', content)
    
    # Replace userId = session.user.id
    content = re.sub(
        r'const userId = session\.user\.id;',
        'const userId = user.id;',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ Updated: {filepath}")

print("🔄 Migrating API routes from NextAuth to Supabase Auth...\n")

count = 0
for filepath in files_to_update:
    if os.path.exists(filepath):
        update_file(filepath)
        count += 1
    else:
        print(f"⚠️  File not found: {filepath}")

print(f"\n✅ Successfully updated {count} files!")
print("\n🎉 Migration complete!")
