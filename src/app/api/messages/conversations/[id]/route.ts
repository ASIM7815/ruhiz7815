
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/conversations/[id] — get paginated messages for a conversation
export async function GET(
  req: NextRequest,
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

  const cursor = req.nextUrl.searchParams.get("cursor");
  const take = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("take") || "50") || 50, 1),
    100
  );

  // Build query
  let query = supabaseAdmin
    .from("direct_messages")
    .select("id, content, sender_id, is_read, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(take + 1);

  if (cursor) {
    // Get the cursor message's created_at
    const { data: cursorMsg } = await supabaseAdmin
      .from("direct_messages")
      .select("created_at")
      .eq("id", cursor)
      .single();

    if (cursorMsg) {
      query = query.lt("created_at", cursorMsg.created_at);
    }
  }

  const { data: messages } = await query;

  if (!messages) {
    return Response.json({ messages: [], nextCursor: null, participant: null });
  }

  const hasMore = messages.length > take;
  const result = hasMore ? messages.slice(0, take) : messages;
  const nextCursor = hasMore ? result[result.length - 1].id : null;

  // Get reactions for these messages
  const messageIds = result.map((m) => m.id);
  const { data: reactions } = await supabaseAdmin
    .from("message_reactions")
    .select("id, message_id, user_id, emoji")
    .in("message_id", messageIds);

  // Map reactions to messages, and convert snake_case to camelCase
  const messagesWithReactions = result.map((m) => ({
    id: m.id,
    content: m.content,
    senderId: m.sender_id,
    isRead: m.is_read,
    createdAt: m.created_at,
    reactions: (reactions || [])
      .filter((r) => r.message_id === m.id)
      .map((r) => ({ id: r.id, userId: r.user_id, emoji: r.emoji })),
  }));

  // Get other participant info from Turso
  const { data: otherPart } = await supabaseAdmin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", userId)
    .single();

  let participantInfo = null;
  if (otherPart) {
    participantInfo = await db.user.findUnique({
      where: { id: otherPart.user_id },
      select: { id: true, uid: true, name: true, image: true },
    });
  }

  return Response.json({
    messages: messagesWithReactions,
    nextCursor,
    participant: participantInfo,
  });
}
