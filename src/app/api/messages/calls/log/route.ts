import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  formatCallLogContent,
  getConversationPeer,
  isCallKind,
  type CallLogStatus,
} from "../utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const callLogStatuses = new Set<CallLogStatus>([
  "cancelled",
  "ended",
  "failed",
  "missed",
  "rejected",
]);

export async function POST(req: NextRequest) {
  const { user, error, status: authStatus } = await requireAuth();
  if (error || !user) {
    return Response.json({ error }, { status: authStatus });
  }

  const { conversationId, durationSeconds, kind, status } = await req.json();

  if (!conversationId || typeof conversationId !== "string") {
    return Response.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
  }

  if (!isCallKind(kind)) {
    return Response.json(
      { error: "kind must be audio or video" },
      { status: 400 }
    );
  }

  if (!callLogStatuses.has(status)) {
    return Response.json({ error: "Invalid call status" }, { status: 400 });
  }

  const { error: peerError } = await getConversationPeer(conversationId, user.id);

  if (peerError) {
    return Response.json({ error: peerError }, { status: 403 });
  }

  const content = formatCallLogContent(kind, status, durationSeconds);

  const { data: message, error: msgErr } = await supabaseAdmin
    .from("direct_messages")
    .insert({
      content,
      conversation_id: conversationId,
      sender_id: user.id,
    })
    .select("id, content, sender_id, is_read, created_at")
    .single();

  if (msgErr || !message) {
    return Response.json(
      { error: "Failed to write call log" },
      { status: 500 }
    );
  }

  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return Response.json(
    {
      message: {
        content: message.content,
        createdAt: message.created_at,
        id: message.id,
        isRead: message.is_read,
        reactions: [],
        senderId: message.sender_id,
      },
    },
    { status: 201 }
  );
}
