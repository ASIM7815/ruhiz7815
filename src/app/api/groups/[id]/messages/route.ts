
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/groups/[id]/messages — paginated messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const take = Math.min(Number(searchParams.get("take")) || 50, 100);

  // Verify membership
  const { data: participant } = await supabaseAdmin
    .from("group_participants")
    .select("id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  let query = supabaseAdmin
    .from("group_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(take + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: messages, error: dbError } = await query;
  if (dbError) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  const hasMore = (messages?.length || 0) > take;
  const result = (messages || []).slice(0, take).reverse();
  const nextCursor = hasMore ? result[0]?.created_at : null;

  return NextResponse.json({ messages: result, nextCursor });
}

// POST /api/groups/[id]/messages — send message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify membership
  const { data: participant } = await supabaseAdmin
    .from("group_participants")
    .select("role, can_share_media")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await req.json();
  const content = body.content?.trim();
  const messageType = body.messageType || "TEXT";
  const fileUrl = body.fileUrl;

  if (!content && !fileUrl) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }

  if (content && content.length > 5000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  // Check media sharing permission
  if (messageType !== "TEXT" && !participant.can_share_media && participant.role !== "ADMIN") {
    return NextResponse.json({ error: "Media sharing not allowed" }, { status: 403 });
  }

  const { data: message, error: dbError } = await supabaseAdmin
    .from("group_messages")
    .insert({
      conversation_id: id,
      sender_id: user.id,
      content,
      message_type: messageType,
      file_url: fileUrl,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  // Update conversation timestamp
  await supabaseAdmin
    .from("group_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json(message);
}
