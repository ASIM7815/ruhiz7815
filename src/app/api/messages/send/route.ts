
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 5000;

// POST /api/messages/send — send a plaintext message
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { conversationId, content } = await req.json();

  if (!conversationId || typeof conversationId !== "string") {
    return Response.json({ error: "conversationId is required" }, { status: 400 });
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return Response.json({ error: "Message content is required" }, { status: 400 });
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
      { status: 400 }
    );
  }

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

  // Create message
  const { data: message, error: msgErr } = await supabaseAdmin
    .from("direct_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
    })
    .select("id, content, sender_id, is_read, created_at")
    .single();

  if (msgErr || !message) {
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }

  // Update conversation timestamp
  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return Response.json(
    {
      id: message.id,
      content: message.content,
      senderId: message.sender_id,
      isRead: message.is_read,
      createdAt: message.created_at,
    },
    { status: 201 }
  );
}
