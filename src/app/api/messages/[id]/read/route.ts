import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

let getIO: (() => import("socket.io").Server) | null = null;
try {
  getIO = require("@/lib/socket-server").getIO;
} catch {
  // Socket.io not available
}

// PATCH /api/messages/[id]/read — mark messages as read up to this message
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const userId = session.user.id;

  // Get the message to find its conversation
  const message = await db.directMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true, createdAt: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Validate user is a participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: message.conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Mark all unread messages from the other user up to this timestamp
  const updated = await db.directMessage.updateMany({
    where: {
      conversationId: message.conversationId,
      senderId: { not: userId },
      isRead: false,
      createdAt: { lte: message.createdAt },
    },
    data: { isRead: true },
  });

  // Emit via Socket.io
  if (getIO) {
    try {
      const io = getIO();
      io.to(`conversation-${message.conversationId}`).emit("messages-read", {
        conversationId: message.conversationId,
        readBy: userId,
        upToMessageId: messageId,
        count: updated.count,
      });
    } catch {
      // Socket.io emit failed
    }
  }

  return NextResponse.json({ ok: true, readCount: updated.count });
}
