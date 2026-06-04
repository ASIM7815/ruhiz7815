
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ensureStudyGroupChat } from "@/lib/study-group-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId, requestId } = await params;
  const body = await req.json().catch(() => ({}));

  // Accept both { status: "ACCEPTED" } and { action: "accept" } formats
  const raw =
    typeof body.action === "string"
      ? body.action.toLowerCase()
      : typeof body.status === "string"
      ? body.status.toLowerCase()
      : "";
  const action =
    raw === "accept" || raw === "accepted"
      ? "ACCEPTED"
      : raw === "reject" || raw === "rejected"
      ? "REJECTED"
      : null;

  if (!action) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Verify the caller is the group leader
  const membership = await db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership || membership.role !== "LEADER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const joinReq = await db.studyGroupJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!joinReq || joinReq.groupId !== groupId) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (joinReq.status !== "PENDING") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }

  const group = await db.studyGroup.findUnique({ where: { id: groupId } });

  // Update the request status
  await db.studyGroupJoinRequest.update({
    where: { id: requestId },
    data: { status: action },
  });

  if (action === "REJECTED") {
    if (group) {
      await db.notification.create({
        data: {
          userId: joinReq.userId,
          type: "GENERAL",
          title: "Study group request declined",
          message: `Your request to join "${group.name}" was declined.`,
        },
      });
    }
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  // ACCEPTED — add the user as a member
  await db.studyGroupMember.upsert({
    where: { groupId_userId: { groupId, userId: joinReq.userId } },
    update: {},
    create: { groupId, userId: joinReq.userId, role: "MEMBER" },
  });

  // Create / update the group conversation in Messages
  let conversationId: string | null = null;
  if (group) {
    try {
      conversationId = (await ensureStudyGroupChat({
        groupId,
        groupName: group.name,
        leaderId: user.id,
        memberId: joinReq.userId,
      })) ?? null;
    } catch (err) {
      console.error("[study-group-chat] Failed to sync group chat:", err);
    }

    await db.notification.create({
      data: {
        userId: joinReq.userId,
        type: "GROUP_INVITATION",
        title: "Study group request approved",
        message: `You've been accepted into "${group.name}". The group chat is now available in Messages.`,
      },
    });
  }

  return NextResponse.json({ success: true, status: "ACCEPTED", conversationId });
}
