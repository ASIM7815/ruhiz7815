import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/messages/[id]/react — add emoji reaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const userId = session.user.id;
  const { emoji } = await req.json();

  if (!emoji || typeof emoji !== "string") {
    return Response.json({ error: "emoji is required" }, { status: 400 });
  }

  // Verify message exists and user has access
  const message = await db.directMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
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
    return Response.json({ error: "Not a participant" }, { status: 403 });
  }

  // Upsert reaction
  const existing = await db.messageReaction.findFirst({
    where: { messageId, userId, emoji },
  });

  if (existing) {
    return Response.json(existing);
  }

  const reaction = await db.messageReaction.create({
    data: { messageId, userId, emoji },
  });

  return Response.json(reaction, { status: 201 });
}

// DELETE /api/messages/[id]/react — remove emoji reaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const userId = session.user.id;
  const { emoji } = await req.json();

  if (!emoji || typeof emoji !== "string") {
    return Response.json({ error: "emoji is required" }, { status: 400 });
  }

  const reaction = await db.messageReaction.findFirst({
    where: { messageId, userId, emoji },
  });

  if (!reaction) {
    return Response.json({ error: "Reaction not found" }, { status: 404 });
  }

  await db.messageReaction.delete({ where: { id: reaction.id } });

  return Response.json({ deleted: true });
}
