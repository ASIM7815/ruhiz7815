#!/usr/bin/env python3
import os
import re

files_to_update = [
    "src/components/group-chat.tsx",
    "src/components/layout/topbar.tsx",
    "src/components/layout/sidebar.tsx",
    "src/app/(platform)/startups/page.tsx",
    "src/app/onboarding/page.tsx",
    "src/app/(platform)/messages/page.tsx",
    "src/app/(platform)/study-groups/page.tsx",
    "src/app/(platform)/knowledge/page.tsx",
    "src/app/(platform)/marketplace/page.tsx",
    "src/app/(platform)/projects/page.tsx",
    "src/app/(platform)/projects/[projectId]/page.tsx",
]

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace useSession import
    content = content.replace(
        'import { useSession } from "next-auth/react";',
        'import { useSupabaseUser } from "@/hooks/use-supabase-user";'
    )
    
    # Replace useSession, signOut import
    content = content.replace(
        'import { useSession, signOut } from "next-auth/react";',
        'import { useSupabaseUser, signOut } from "@/hooks/use-supabase-user";'
    )
    
    # Replace useSession() call
    content = re.sub(
        r'const \{ data: session \} = useSession\(\);',
        'const { user } = useSupabaseUser();',
        content
    )
    
    # Replace session?.user?.id with user?.id
    content = re.sub(r'session\?\.user\?\.id', 'user?.id', content)
    content = re.sub(r'session\?\.user\?\.name', 'user?.user_metadata?.full_name', content)
    content = re.sub(r'session\?\.user\?\.email', 'user?.email', content)
    content = re.sub(r'session\?\.user', 'user', content)
    
    # Replace session.user.id with user.id
    content = re.sub(r'session\.user\.id', 'user.id', content)
    content = re.sub(r'session\.user\.name', 'user.user_metadata.full_name', content)
    content = re.sub(r'session\.user\.email', 'user.email', content)
    
    # Replace userId = session?.user?.id
    content = re.sub(
        r'const userId = session\?\.user\?\.id;',
        'const userId = user?.id;',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ Updated: {filepath}")

print("🔄 Migrating client components from NextAuth to Supabase Auth...\n")

count = 0
for filepath in files_to_update:
    if os.path.exists(filepath):
        update_file(filepath)
        count += 1
    else:
        print(f"⚠️  File not found: {filepath}")

print(f"\n✅ Successfully updated {count} files!")
print("\n🎉 Client migration complete!")
