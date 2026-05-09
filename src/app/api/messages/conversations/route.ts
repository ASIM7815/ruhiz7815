
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/conversations — list all conversations for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get conversation IDs where user is a participant
  const { data: participations } = await supabaseAdmin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!participations || participations.length === 0) {
    return Response.json([]);
  }

  const conversationIds = participations.map((p) => p.conversation_id);

  // Get conversations ordered by updated_at
  const { data: conversations } = await supabaseAdmin
    .from("conversations")
    .select("id, updated_at")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (!conversations || conversations.length === 0) {
    return Response.json([]);
  }

  const result = await Promise.all(
    conversations.map(async (conv) => {
      // Get other participant's user_id
      const { data: otherParts } = await supabaseAdmin
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conv.id)
        .neq("user_id", userId)
        .limit(1);

      const otherUserId = otherParts?.[0]?.user_id;

      // Get user info from Turso/Prisma
      let participant = null;
      if (otherUserId) {
        participant = await db.user.findUnique({
          where: { id: otherUserId },
          select: { id: true, uid: true, name: true, image: true },
        });
      }

      // Last message
      const { data: lastMsgs } = await supabaseAdmin
        .from("direct_messages")
        .select("id, content, sender_id, is_read, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lm = lastMsgs?.[0];
      const lastMessage = lm
        ? {
            id: lm.id,
            content: lm.content,
            senderId: lm.sender_id,
            isRead: lm.is_read,
            createdAt: lm.created_at,
          }
        : null;

      // Unread count
      const { count } = await supabaseAdmin
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", userId)
        .eq("is_read", false);

      return {
        id: conv.id,
        participant,
        lastMessage,
        unreadCount: count ?? 0,
        updatedAt: conv.updated_at,
      };
    })
  );

  return Response.json(result);
}

// POST /api/messages/conversations — create or get existing conversation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { targetUserId } = await req.json();

  if (!targetUserId || typeof targetUserId !== "string") {
    return Response.json({ error: "targetUserId is required" }, { status: 400 });
  }

  if (targetUserId === userId) {
    return Response.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  // Check target user exists (Turso)
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, uid: true, name: true, image: true },
  });

  if (!targetUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Check if conversation already exists
  const { data: myParts } = await supabaseAdmin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (myParts && myParts.length > 0) {
    const myConvIds = myParts.map((p) => p.conversation_id);

    const { data: shared } = await supabaseAdmin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", targetUserId)
      .in("conversation_id", myConvIds)
      .limit(1);

    if (shared && shared.length > 0) {
      return Response.json({
        conversationId: shared[0].conversation_id,
        participant: targetUser,
        isNew: false,
      });
    }
  }

  // Create new conversation
  const { data: newConv, error: convErr } = await supabaseAdmin
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (convErr || !newConv) {
    return Response.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  // Add both participants
  await supabaseAdmin.from("conversation_participants").insert([
    { conversation_id: newConv.id, user_id: userId },
    { conversation_id: newConv.id, user_id: targetUserId },
  ]);

  return Response.json({
    conversationId: newConv.id,
    participant: targetUser,
    isNew: true,
  });
}
