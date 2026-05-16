import { supabaseAdmin } from "@/lib/supabase-server";

type ProjectGroupInput = {
  projectId: string;
  name: string;
  creatorId: string;
};

type GroupParticipantRole = "ADMIN" | "MEMBER";

export async function getProjectGroup(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from("group_conversations")
    .select("*")
    .eq("entity_id", projectId)
    .eq("type", "PROJECT")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load project group: ${error.message}`);
  }

  return data;
}

export async function ensureProjectGroup(input: ProjectGroupInput) {
  const existing = await getProjectGroup(input.projectId);

  if (existing) {
    if (existing.name !== input.name) {
      await supabaseAdmin
        .from("group_conversations")
        .update({ name: input.name, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    await ensureGroupParticipant(existing.id, input.creatorId, "ADMIN");
    return { ...existing, name: input.name };
  }

  const { data: group, error } = await supabaseAdmin
    .from("group_conversations")
    .insert({
      name: input.name,
      type: "PROJECT",
      entity_id: input.projectId,
      created_by: input.creatorId,
    })
    .select("*")
    .single();

  if (error || !group) {
    throw new Error(`Failed to create project group: ${error?.message || "unknown error"}`);
  }

  await ensureGroupParticipant(group.id, input.creatorId, "ADMIN");
  return group;
}

export async function ensureGroupParticipant(
  groupId: string,
  userId: string,
  role: GroupParticipantRole = "MEMBER"
) {
  const { error } = await supabaseAdmin.from("group_participants").upsert(
    {
      conversation_id: groupId,
      user_id: userId,
      role,
    },
    { onConflict: "conversation_id,user_id" }
  );

  if (error) {
    throw new Error(`Failed to sync group participant: ${error.message}`);
  }
}

export async function addProjectGroupMember(
  projectId: string,
  userId: string,
  role: GroupParticipantRole,
  fallbackGroup: ProjectGroupInput
) {
  const group = await ensureProjectGroup(fallbackGroup);
  await ensureGroupParticipant(group.id, userId, role);
  return group;
}

export async function removeProjectGroupMember(projectId: string, userId: string) {
  const group = await getProjectGroup(projectId);
  if (!group) return;

  const { error } = await supabaseAdmin
    .from("group_participants")
    .delete()
    .eq("conversation_id", group.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to remove group participant: ${error.message}`);
  }
}

export async function userIsGroupParticipant(groupId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("group_participants")
    .select("id, role")
    .eq("conversation_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify group participant: ${error.message}`);
  }

  return data;
}
