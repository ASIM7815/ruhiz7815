import { supabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/lib/db";

type StartupGroupResult = {
  id: string;
  name: string;
  isAdmin: boolean;
};

/**
 * Get or create a Supabase group for a startup
 */
export async function ensureStartupGroup(params: {
  startupId: string;
  name: string;
  founderId: string;
}): Promise<string> {
  const { startupId, name, founderId } = params;

  // Check if group already exists
  const { data: existing } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("entity_type", "startup")
    .eq("entity_id", startupId)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new group
  const { data: newGroup, error } = await supabaseAdmin
    .from("groups")
    .insert({
      name,
      entity_type: "startup",
      entity_id: startupId,
      created_by: founderId,
    })
    .select("id")
    .single();

  if (error || !newGroup) {
    throw new Error(`Failed to create startup group: ${error?.message}`);
  }

  // Add founder as admin member
  await supabaseAdmin.from("group_members").insert({
    group_id: newGroup.id,
    user_id: founderId,
    role: "ADMIN",
  });

  return newGroup.id;
}

/**
 * Get startup's Supabase group for a user
 */
export async function getStartupGroup(
  startupId: string,
  userId: string
): Promise<StartupGroupResult | null> {
  // Get the group
  const { data: group } = await supabaseAdmin
    .from("groups")
    .select("id, name")
    .eq("entity_type", "startup")
    .eq("entity_id", startupId)
    .single();

  if (!group) {
    return null;
  }

  // Check if user is a member
  const { data: membership } = await supabaseAdmin
    .from("group_members")
    .select("role")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return null;
  }

  return {
    id: group.id,
    name: group.name,
    isAdmin: membership.role === "ADMIN",
  };
}

/**
 * Add a member to startup's Supabase group
 */
export async function addStartupGroupMember(
  startupId: string,
  userId: string
): Promise<void> {
  // Get the group
  const { data: group } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("entity_type", "startup")
    .eq("entity_id", startupId)
    .single();

  if (!group) {
    throw new Error("Startup group not found");
  }

  // Add member
  await supabaseAdmin.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "MEMBER",
  });
}

/**
 * Remove a member from startup's Supabase group
 */
export async function removeStartupGroupMember(
  startupId: string,
  userId: string
): Promise<void> {
  // Get the group
  const { data: group } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("entity_type", "startup")
    .eq("entity_id", startupId)
    .single();

  if (!group) {
    return;
  }

  // Remove member
  await supabaseAdmin
    .from("group_members")
    .delete()
    .eq("group_id", group.id)
    .eq("user_id", userId);
}
