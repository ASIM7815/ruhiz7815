
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
      data: { status: "REJECTED" },
    });
    await db.notification.create({
      data: {
        userId: joinRequest.userId,
        type: "PROJECT_JOIN_REJECTED",
        title: "Project request declined",
        message: `Your request to join ${project.title} was declined.`,
      },
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  if (project._count.members >= project.maxMembers) {
    return NextResponse.json({ error: "This project team is already full" }, { status: 409 });
  }

  // Accept: add as member + handle group creation
  await db.$transaction(async (tx) => {
    await tx.joinRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });

    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: joinRequest.userId } },
      update: { role: "MEMBER" },
      create: { projectId, userId: joinRequest.userId, role: "MEMBER" },
    });

    await tx.notification.create({
      data: {
        userId: joinRequest.userId,
        type: "PROJECT_JOIN_ACCEPTED",
        title: "Project request approved",
        message: `You joined ${project.title}. A group chat is ready in Messages.`,
      },
    });
  });

  const groupConversationId = await ensureProjectGroupChat({
    projectId,
    projectTitle: project.title,
    ownerId: project.ownerId,
    memberId: joinRequest.userId,
  });

  return NextResponse.json({
    success: true,
    status: "ACCEPTED",
    groupConversationId,
  });
}
