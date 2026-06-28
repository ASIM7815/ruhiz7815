import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-middleware";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toMessageResponse(message: {
  id: string;
  content: string;
  sender_id: string;
  is_read: boolean;
  created_at: string;
}) {
  return {
    id: message.id,
    content: message.content,
    senderId: message.sender_id,
    isRead: message.is_read,
    createdAt: message.created_at,
    reactions: [],
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { content } = await req.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("direct_messages")
      .select("id, sender_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (existing.sender_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    const { data: updatedMessage, error: updateError } = await supabaseAdmin
      .from("direct_messages")
      .update({ content: content.trim() })
      .eq("id", id)
      .select("id, content, sender_id, is_read, created_at")
      .single();

    if (updateError || !updatedMessage) {
      return NextResponse.json(
        { error: "Failed to edit message" },
        { status: 500 }
      );
    }

    return NextResponse.json(toMessageResponse(updatedMessage));
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("direct_messages")
      .select("id, sender_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (existing.sender_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("direct_messages")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
