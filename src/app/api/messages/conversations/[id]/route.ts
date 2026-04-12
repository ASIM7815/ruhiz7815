import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/messages/conversations/[id] — paginated messages for a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const userId = session.user.id;

  // Validate user is a participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");
  const take = 50;

  const messages = await db.directMessage.findMany({
    where: { conversationId },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
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
  const items = hasMore ? messages.slice(0, take) : messages;

  // Get other participant info
  const otherParticipant = await db.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: userId } },
    include: {
      user: {
        select: {
          id: true,
          uid: true,
          name: true,
          image: true,
          publicKey: true,
        },
      },
    },
  });

  return NextResponse.json({
    messages: items.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      encryptedContent: m.encryptedContent,
      encryptedKeySender: m.encryptedKeySender,
      encryptedKeyRecipient: m.encryptedKeyRecipient,
      iv: m.iv,
      isRead: m.isRead,
      createdAt: m.createdAt,
      reactions: m.reactions,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    participant: otherParticipant
      ? {
          ...otherParticipant.user,
          publicKey: otherParticipant.user.publicKey
            ? JSON.parse(otherParticipant.user.publicKey)
            : null,
        }
      : null,
  });
}
