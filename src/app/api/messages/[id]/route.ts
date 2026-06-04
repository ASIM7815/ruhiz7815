import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await req.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Check if message exists and belongs to user
    const message = await db.$queryRaw<
      Array<{ sender_id: string; conversation_id: string }>
    >`
      SELECT sender_id, conversation_id 
      FROM direct_messages 
      WHERE id = ${id}
    `;

    if (!message || message.length === 0) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (message[0].sender_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    // Update message
    await db.$executeRaw`
      UPDATE direct_messages 
      SET content = ${content.trim()}, 
          updated_at = NOW() 
      WHERE id = ${id}
    `;

    // Fetch updated message
    const updatedMessage = await db.$queryRaw<
      Array<{
        id: string;
        content: string;
        sender_id: string;
        is_read: boolean;
        created_at: Date;
      }>
    >`
      SELECT id, content, sender_id, is_read, created_at 
      FROM direct_messages 
      WHERE id = ${id}
    `;

    return NextResponse.json({
      id: updatedMessage[0].id,
      content: updatedMessage[0].content,
      senderId: updatedMessage[0].sender_id,
      isRead: updatedMessage[0].is_read,
      createdAt: updatedMessage[0].created_at.toISOString(),
      reactions: [],
    });
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if message exists and belongs to user
    const message = await db.$queryRaw<
      Array<{ sender_id: string }>
    >`
      SELECT sender_id 
      FROM direct_messages 
      WHERE id = ${id}
    `;

    if (!message || message.length === 0) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (message[0].sender_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Delete message
    await db.$executeRaw`
      DELETE FROM direct_messages 
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
