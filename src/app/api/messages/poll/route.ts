import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/messages/poll?conversationId=X&since=ISO — lightweight polling endpoint
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  const since = req.nextUrl.searchParams.get("since");

  if (!conversationId) {
    return Response.json(
      { error: "conversationId is required" },
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

  const sinceDate = since ? new Date(since) : new Date(0);

  // Get new messages since the given timestamp
  const newMessages = await db.directMessage.findMany({
    where: {
      conversationId,
      createdAt: { gt: sinceDate },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      senderId: true,
      isRead: true,
      createdAt: true,
      reactions: {
        select: {
          id: true,
          userId: true,
          emoji: true,
        },
      },
    },
  });

  // Get unread count for this conversation (messages from the other user)
  const unreadCount = await db.directMessage.count({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
  });

  return Response.json({
    messages: newMessages,
    unreadCount,
    timestamp: new Date().toISOString(),
  });
}
