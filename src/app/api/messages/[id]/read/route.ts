import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/messages/[id]/read — mark all unread messages in conversation as read
export async function PATCH(
  _req: Request,
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

  // Mark all unread messages from the other user as read
  const result = await db.directMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  return Response.json({ markedRead: result.count });
}
