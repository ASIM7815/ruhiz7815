import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

let getIO: (() => import("socket.io").Server) | null = null;
try {
  getIO = require("@/lib/socket-server").getIO;
} catch {
  // Socket.io not available
}

// POST /api/messages/[id]/react — add a reaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const userId = session.user.id;
  const body = await req.json();
  const { emoji } = body;

  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: "Emoji required" }, { status: 400 });
  }

  // Verify message exists and user is a participant
  const message = await db.directMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

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

  // Upsert reaction (unique: messageId + userId + emoji)
  const reaction = await db.messageReaction.upsert({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
    create: { messageId, userId, emoji },
    update: {},
  });

  // Emit via Socket.io
  if (getIO) {
    try {
      const io = getIO();
      io.to(`conversation-${message.conversationId}`).emit("reaction-update", {
        messageId,
        reaction: { id: reaction.id, userId, emoji },
        action: "add",
      });
    } catch {
      // Socket.io emit failed
    }
  }

  return NextResponse.json({ ok: true, reaction });
}

// DELETE /api/messages/[id]/react — remove a reaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const userId = session.user.id;
  const { emoji } = await req.json();

  if (!emoji) {
    return NextResponse.json({ error: "Emoji required" }, { status: 400 });
  }

  // Verify message exists
  const message = await db.directMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  await db.messageReaction.deleteMany({
    where: { messageId, userId, emoji },
  });

  // Emit via Socket.io
  if (getIO) {
    try {
      const io = getIO();
      io.to(`conversation-${message.conversationId}`).emit("reaction-update", {
        messageId,
        reaction: { userId, emoji },
        action: "remove",
      });
    } catch {
      // Socket.io emit failed
    }
  }

  return NextResponse.json({ ok: true });
}
