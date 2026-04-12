import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// We import getIO lazily since Socket.io is only available with custom server
let getIO: (() => import("socket.io").Server) | null = null;
try {
  getIO = require("@/lib/socket-server").getIO;
} catch {
  // Socket.io not available (e.g. during build)
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { conversationId, encryptedContent, encryptedKeySender, encryptedKeyRecipient, iv } = body;

  if (!conversationId || !encryptedContent || !encryptedKeySender || !encryptedKeyRecipient || !iv) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Validate sender is a participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Create the message
  const message = await db.directMessage.create({
    data: {
      conversationId,
      senderId: userId,
      encryptedContent,
      encryptedKeySender,
      encryptedKeyRecipient,
      iv,
    },
  });

  // Update conversation timestamp
  await db.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Emit via Socket.io if available
  if (getIO) {
    try {
      const io = getIO();
      // Emit to conversation room
      io.to(`conversation-${conversationId}`).emit("new-message", {
        id: message.id,
        conversationId,
        senderId: userId,
        encryptedContent,
        encryptedKeySender,
        encryptedKeyRecipient,
        iv,
        isRead: false,
        createdAt: message.createdAt,
        reactions: [],
      });

      // Find the other participant and notify them
      const otherParticipant = await db.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: userId } },
      });
      if (otherParticipant) {
        io.to(`user-${otherParticipant.userId}`).emit(
          "new-conversation-message",
          {
            conversationId,
            senderId: userId,
            messageId: message.id,
          }
        );
      }
    } catch {
      // Socket.io emit failed — message is still saved
    }
  }

  return NextResponse.json(
    {
      id: message.id,
      conversationId,
      senderId: userId,
      encryptedContent,
      encryptedKeySender,
      encryptedKeyRecipient,
      iv,
      isRead: false,
      createdAt: message.createdAt,
      reactions: [],
    },
    { status: 201 }
  );
}
