
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/messages/[id]/react — add emoji reaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const userId = user.id;
  const { emoji } = await req.json();

  if (!emoji || typeof emoji !== "string") {
    return Response.json({ error: "emoji is required" }, { status: 400 });
  }

  // Verify message exists and user has access
  const { data: message } = await supabaseAdmin
    .from("direct_messages")
    .select("conversation_id")
    .eq("id", messageId)
    .single();

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  const { data: participant } = await supabaseAdmin
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", message.conversation_id)
    .eq("user_id", userId)
    .single();

  if (!participant) {
    return Response.json({ error: "Not a participant" }, { status: 403 });
  }

  // Check if reaction already exists
  const { data: existing } = await supabaseAdmin
    .from("message_reactions")
    .select("id, user_id, emoji")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    return Response.json({ id: existing.id, userId: existing.user_id, emoji: existing.emoji });
  }

  // Create reaction
  const { data: reaction, error: rErr } = await supabaseAdmin
    .from("message_reactions")
    .insert({ message_id: messageId, user_id: userId, emoji })
    .select("id, user_id, emoji")
    .single();

  if (rErr || !reaction) {
    return Response.json({ error: "Failed to add reaction" }, { status: 500 });
  }

  return Response.json(
    { id: reaction.id, userId: reaction.user_id, emoji: reaction.emoji },
    { status: 201 }
  );
}

// DELETE /api/messages/[id]/react — remove emoji reaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const userId = user.id;
  const { emoji } = await req.json();

  if (!emoji || typeof emoji !== "string") {
    return Response.json({ error: "emoji is required" }, { status: 400 });
  }

  const { error: dbError } = await supabaseAdmin
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji);

  if (dbError) {
    return Response.json({ error: "Reaction not found" }, { status: 404 });
  }

  return Response.json({ deleted: true });
}
