import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/messages/conversations — list all conversations for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const participantRows = await db.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  const conversationIds = participantRows.map((p) => p.conversationId);

  if (conversationIds.length === 0) {
    return NextResponse.json({ conversations: [] });
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
          senderId: true,
          encryptedContent: true,
          encryptedKeySender: true,
          encryptedKeyRecipient: true,
          iv: true,
          isRead: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Count unread messages per conversation
  const unreadCounts = await Promise.all(
    conversationIds.map(async (cid) => {
      const count = await db.directMessage.count({
        where: {
          conversationId: cid,
          senderId: { not: userId },
          isRead: false,
        },
      });
      return { conversationId: cid, count };
    })
  );

  const unreadMap = new Map(
    unreadCounts.map((u) => [u.conversationId, u.count])
  );

  const result = conversations.map((c) => {
    const otherParticipant = c.participants.find((p) => p.userId !== userId);
    const lastMessage = c.messages[0] || null;

    return {
      id: c.id,
      participant: otherParticipant
        ? {
            id: otherParticipant.user.id,
            uid: otherParticipant.user.uid,
            name: otherParticipant.user.name,
            image: otherParticipant.user.image,
          }
        : null,
      lastMessage,
      unreadCount: unreadMap.get(c.id) || 0,
      updatedAt: c.updatedAt,
    };
  });

  return NextResponse.json({ conversations: result });
}

// POST /api/messages/conversations — create or find existing conversation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { participantId } = body;

  if (!participantId || participantId === userId) {
    return NextResponse.json(
      { error: "Invalid participant" },
      { status: 400 }
    );
  }

  // Check if a conversation already exists between these two users
  const myConversations = await db.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  for (const row of myConversations) {
    const other = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: row.conversationId,
          userId: participantId,
        },
      },
    });
    if (other) {
      // Existing conversation found
      const participant = await db.user.findUnique({
        where: { id: participantId },
        select: {
          id: true,
          uid: true,
          name: true,
          image: true,
          publicKey: true,
        },
      });
      return NextResponse.json({
        conversationId: row.conversationId,
        participant: participant
          ? {
              ...participant,
              publicKey: participant.publicKey
                ? JSON.parse(participant.publicKey)
                : null,
            }
          : null,
      });
    }
  }

  // Create new conversation
  const conversation = await db.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: participantId }],
      },
    },
  });

  const participant = await db.user.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      uid: true,
      name: true,
      image: true,
      publicKey: true,
    },
  });

  return NextResponse.json(
    {
      conversationId: conversation.id,
      participant: participant
        ? {
            ...participant,
            publicKey: participant.publicKey
              ? JSON.parse(participant.publicKey)
              : null,
          }
        : null,
    },
    { status: 201 }
  );
}
