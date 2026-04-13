import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_MESSAGE_LENGTH = 5000;

// POST /api/messages/send — send a plaintext message
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { conversationId, content } = body;

  if (!conversationId || typeof conversationId !== "string") {
    return Response.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
  }

  if (
    !content ||
    typeof content !== "string" ||
    content.trim().length === 0
  ) {
    return Response.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
      { status: 400 }
    );
  }

  // Verify user is a participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!participant) {
    return Response.json({ error: "Not a participant" }, { status: 403 });
  }

  // Create message and update conversation timestamp
  const [message] = await db.$transaction([
    db.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: content.trim(),
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        isRead: true,
        createdAt: true,
      },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return Response.json(message, { status: 201 });
}
