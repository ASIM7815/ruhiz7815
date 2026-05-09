
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/messages/[id]/read — mark all unread messages in conversation as read
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const userId = session.user.id;

  // Verify user is a participant
  const { data: participant } = await supabaseAdmin
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .single();

  if (!participant) {
    return Response.json({ error: "Not a participant" }, { status: 403 });
  }

  // Mark all unread messages from the other user as read
  const { data } = await supabaseAdmin
    .from("direct_messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false)
    .select("id");

  return Response.json({ markedRead: data?.length ?? 0 });
}
