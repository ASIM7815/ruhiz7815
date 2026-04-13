import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/messages/conversations — list all conversations for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const participations = await db.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  const conversationIds = participations.map((p) => p.conversationId);

  if (conversationIds.length === 0) {
    return Response.json([]);
  }

  const conversations = await db.conversation.findMany({
    where: { id: { in: conversationIds } },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              uid: true,
              name: true,
              image: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          senderId: true,
          isRead: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = await Promise.all(
    conversations.map(async (conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p.userId !== userId
      );
      const unreadCount = await db.directMessage.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          isRead: false,
        },
      });

      return {
        id: conv.id,
        participant: otherParticipant?.user ?? null,
        lastMessage: conv.messages[0] ?? null,
        unreadCount,
        updatedAt: conv.updatedAt.toISOString(),
      };
    })
  );

  return Response.json(result);
}

// POST /api/messages/conversations — create or get existing conversation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { targetUserId } = body;

  if (!targetUserId || typeof targetUserId !== "string") {
    return Response.json(
      { error: "targetUserId is required" },
      { status: 400 }
    );
  }

  if (targetUserId === userId) {
    return Response.json(
      { error: "Cannot message yourself" },
      { status: 400 }
    );
  }

  // Check target user exists
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, uid: true, name: true, image: true },
  });

  if (!targetUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Check if conversation already exists between these two users
  const existingParticipations = await db.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  for (const p of existingParticipations) {
    const otherParticipant = await db.conversationParticipant.findFirst({
      where: {
        conversationId: p.conversationId,
        userId: targetUserId,
      },
    });
    if (otherParticipant) {
      return Response.json({
        conversationId: p.conversationId,
        participant: targetUser,
        isNew: false,
      });
    }
  }

  // Create new conversation
  const conversation = await db.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: targetUserId }],
      },
    },
  });

  return Response.json({
    conversationId: conversation.id,
    participant: targetUser,
    isNew: true,
  });
}
