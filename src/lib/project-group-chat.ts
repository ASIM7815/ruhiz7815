import { supabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/lib/db";

type EnsureProjectGroupChatArgs = {
  projectId: string;
  projectTitle: string;
  ownerId: string;
  memberId: string;
};

function formatSupabaseError(context: string, error: { message?: string } | null) {
  return `${context}${error?.message ? `: ${error.message}` : ""}`;
}

export async function ensureProjectGroupChat({
  projectId,
  projectTitle,
  ownerId,
  memberId,
}: EnsureProjectGroupChatArgs) {
  const { data: existingGroups, error: lookupError } = await supabaseAdmin
    .from("group_conversations")
    .select("id")
    .eq("type", "PROJECT")
    .eq("entity_id", projectId)
    .limit(1);

  if (lookupError) {
    throw new Error(formatSupabaseError("Failed to look up project group chat", lookupError));
  }

  let conversationId = existingGroups?.[0]?.id as string | undefined;

  if (!conversationId) {
    const { data: newGroup, error: createError } = await supabaseAdmin
      .from("group_conversations")
      .insert({
        name: projectTitle,
        type: "PROJECT",
        entity_id: projectId,
        created_by: ownerId,
      })
      .select("id")
      .single();

    if (createError || !newGroup) {
      throw new Error(formatSupabaseError("Failed to create project group chat", createError));
    }

    conversationId = newGroup.id;
  }

  // Get all project members from Prisma
  const allMembers = await db.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });

  // Create participants array for all members
  const participants = allMembers.map((member) => ({
    conversation_id: conversationId!,
    user_id: member.userId,
    role: member.userId === ownerId ? "ADMIN" : "MEMBER",
    can_share_media: true,
  }));

  // Ensure the newly added member is included (in case of race condition)
  if (!participants.some((p) => p.user_id === memberId)) {
    participants.push({
      conversation_id: conversationId!,
      user_id: memberId,
      role: memberId === ownerId ? "ADMIN" : "MEMBER",
      can_share_media: true,
    });
  }

  const { error: participantError } = await supabaseAdmin
    .from("group_participants")
    .upsert(participants, { onConflict: "conversation_id,user_id" });

  if (participantError) {
    throw new Error(formatSupabaseError("Failed to add project group participants", participantError));
  }

  return conversationId;
}

export async function getProjectGroupConversationId(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from("group_conversations")
    .select("id")
    .eq("type", "PROJECT")
    .eq("entity_id", projectId)
    .limit(1);

  if (error) {
    throw new Error(formatSupabaseError("Failed to load project group chat", error));
  }

  return (data?.[0]?.id as string | undefined) ?? null;
}
