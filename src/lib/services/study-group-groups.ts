import { supabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/lib/db";

type StudyGroupGroupResult = {
  id: string;
  name: string;
  isAdmin: boolean;
};

/**
 * Get or create a Supabase group for a study group
 */
export async function ensureStudyGroupGroup(params: {
  studyGroupId: string;
  name: string;
  creatorId: string;
}): Promise<string> {
  const { studyGroupId, name, creatorId } = params;

  // Check if group already exists
  const { data: existing } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("entity_type", "study_group")
    .eq("entity_id", studyGroupId)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new group
  const { data: newGroup, error } = await supabaseAdmin
    .from("groups")
    .insert({
      name,
      entity_type: "study_group",
      entity_id: studyGroupId,
      created_by: creatorId,
    })
    .select("id")
    .single();

  if (error || !newGroup) {
    throw new Error(`Failed to create study group group: ${error?.message}`);
  }

  // Add creator as admin member
  await supabaseAdmin.from("group_members").insert({
    group_id: newGroup.id,
    user_id: creatorId,
    role: "ADMIN",
  });

  return newGroup.id;
}

/**
 * Get study group's Supabase group for a user
 */
export async function getStudyGroupGroup(
  studyGroupId: string,
  userId: string
): Promise<StudyGroupGroupResult | null> {
  // Get the group
  const { data: group } = await supabaseAdmin
    .from("groups")
    .select("id, name")
    .eq("entity_type", "study_group")
    .eq("entity_id", studyGroupId)
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
 * Add a member to study group's Supabase group
 */
export async function addStudyGroupGroupMember(
  studyGroupId: string,
  userId: string
): Promise<void> {
  // Get the group
  const { data: group } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("entity_type", "study_group")
    .eq("entity_id", studyGroupId)
    .single();

  if (!group) {
    throw new Error("Study group group not found");
  }

  // Add member
  await supabaseAdmin.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "MEMBER",
  });
}

/**
 * Remove a member from study group's Supabase group
 */
export async function removeStudyGroupGroupMember(
  studyGroupId: string,
  userId: string
): Promise<void> {
  // Get the group
  const { data: group } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("entity_type", "study_group")
    .eq("entity_id", studyGroupId)
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
