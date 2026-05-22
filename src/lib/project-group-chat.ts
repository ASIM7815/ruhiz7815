import { supabaseAdmin } from "@/lib/supabase-server";

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

  const { error: participantError } = await supabaseAdmin
    .from("group_participants")
    .upsert(
      [
        {
          conversation_id: conversationId,
          user_id: ownerId,
          role: "ADMIN",
          can_share_media: true,
        },
        {
          conversation_id: conversationId,
          user_id: memberId,
          role: memberId === ownerId ? "ADMIN" : "MEMBER",
          can_share_media: true,
        },
      ],
      { onConflict: "conversation_id,user_id" }
    );

  if (participantError) {
    throw new Error(formatSupabaseError("Failed to add project group participants", participantError));
  }

  return conversationId;
}
