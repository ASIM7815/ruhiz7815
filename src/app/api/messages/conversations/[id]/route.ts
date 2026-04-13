import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/messages/conversations/[id] — get paginated messages for a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const userId = session.user.id;

  // Verify user is a participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!participant) {
    return Response.json({ error: "Not a participant" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");
  const take = 50;

  const messages = await db.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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

  const hasMore = messages.length > take;
  const result = hasMore ? messages.slice(0, take) : messages;
  const nextCursor = hasMore ? result[result.length - 1].id : null;

  // Get the other participant's info
  const otherParticipant = await db.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: userId } },
    include: {
      user: {
        select: { id: true, uid: true, name: true, image: true },
      },
    },
  });

  return Response.json({
    messages: result,
    nextCursor,
    participant: otherParticipant?.user ?? null,
  });
}
