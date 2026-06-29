
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ensureProjectGroupChat } from "@/lib/project-group-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/projects/[projectId]/join/[requestId] — accept or reject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; requestId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, requestId } = await params;

  // Verify ownership
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      title: true,
      maxMembers: true,
      _count: { select: { members: true } },
    },
  });

  if (!project || project.ownerId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const rawDecision =
    typeof body.action === "string"
      ? body.action.toLowerCase()
      : typeof body.status === "string"
      ? body.status.toLowerCase()
      : "";
  const action =
    rawDecision === "accept" || rawDecision === "accepted"
      ? "accept"
      : rawDecision === "reject" || rawDecision === "rejected"
      ? "reject"
      : null;

  if (!action) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const joinRequest = await db.joinRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  if (!joinRequest || joinRequest.projectId !== projectId) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (joinRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }

  if (action === "reject") {
    await db.joinRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedBy: user.id },
    });
    await db.notification.create({
      data: {
        userId: joinRequest.userId,
        type: "PROJECT_REJECTED",
        title: "Project request declined",
        message: `Your request to join ${project.title} was declined.`,
        data: { projectId, requestId },
      },
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  if (project._count.members >= project.maxMembers) {
    return NextResponse.json({ error: "This project team is already full" }, { status: 409 });
  }

  // Accept: add as member, create/sync the project group, then notify the requester.
  await db.$transaction(async (tx) => {
    await tx.joinRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", reviewedAt: new Date(), reviewedBy: user.id },
    });

    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: joinRequest.userId } },
      update: { role: "MEMBER" },
      create: { projectId, userId: joinRequest.userId, role: "MEMBER" },
    });
  });

  const groupConversationId = await ensureProjectGroupChat({
    projectId,
    projectTitle: project.title,
    ownerId: project.ownerId,
    memberId: joinRequest.userId,
  });

  await db.notification.create({
    data: {
      userId: joinRequest.userId,
      type: "PROJECT_ACCEPTED",
      title: "Project request approved",
      message: `Your request to join ${project.title} was approved. A group was created for your team and you can open it from the Messages tab.`,
      data: { projectId, requestId, groupConversationId },
    },
  });

  return NextResponse.json({
    success: true,
    status: "ACCEPTED",
    groupConversationId,
  });
}
