import { supabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function ensureStudyGroupChat({
  groupId,
  groupName,
  leaderId,
  memberId,
}: {
  groupId: string;
  groupName: string;
  leaderId: string;
  memberId: string;
}) {
  const { data: existing } = await supabaseAdmin
    .from("group_conversations")
    .select("id")
    .eq("type", "STUDY_GROUP")
    .eq("entity_id", groupId)
    .limit(1);

  let conversationId = existing?.[0]?.id as string | undefined;

  if (!conversationId) {
    const { data: newConv, error: createError } = await supabaseAdmin
      .from("group_conversations")
      .insert({
        name: groupName,
        type: "STUDY_GROUP",
        entity_id: groupId,
        created_by: leaderId,
      })
      .select("id")
      .single();

    if (createError || !newConv) {
      throw new Error(`Failed to create study group chat: ${createError?.message ?? ""}`);
    }
    conversationId = newConv.id;
  }

  // Sync all current members into the conversation
  const allMembers = await db.studyGroupMember.findMany({
    where: { groupId },
    select: { userId: true, role: true },
  });

  const participants = allMembers.map((m) => ({
    conversation_id: conversationId!,
    user_id: m.userId,
    role: m.role === "LEADER" ? "ADMIN" : "MEMBER",
    can_share_media: true,
  }));

  // Ensure newly accepted member is included
  if (!participants.some((p) => p.user_id === memberId)) {
    participants.push({
      conversation_id: conversationId!,
      user_id: memberId,
      role: "MEMBER",
      can_share_media: true,
    });
  }

  const { error: participantError } = await supabaseAdmin
    .from("group_participants")
    .upsert(participants, { onConflict: "conversation_id,user_id" });

  if (participantError) {
    throw new Error(`Failed to sync study group participants: ${participantError.message}`);
  }

  return conversationId;
}

export async function getStudyGroupConversationId(groupId: string) {
  const { data } = await supabaseAdmin
    .from("group_conversations")
    .select("id")
    .eq("type", "STUDY_GROUP")
    .eq("entity_id", groupId)
    .limit(1);

  return (data?.[0]?.id as string | undefined) ?? null;
}
