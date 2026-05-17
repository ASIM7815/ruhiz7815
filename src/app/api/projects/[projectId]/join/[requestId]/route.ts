import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/services/notifications";
import { isProjectAdminRole } from "@/lib/services/permissions";
import { addProjectGroupMember } from "@/lib/services/project-groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/projects/[projectId]/join/[requestId] — approve or reject join request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; requestId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, requestId } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body;

  if (!["ACCEPTED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify the request exists
  const joinRequest = await db.joinRequest.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { id: true, name: true } },
      project: {
        select: {
          id: true,
          ownerId: true,
          title: true,
          maxMembers: true,
        },
      },
    },
  });

  if (!joinRequest || joinRequest.projectId !== projectId) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (joinRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }

  // Verify user is project admin
  const membership = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: user.id },
    },
    select: { role: true, status: true },
  });

  const isOwner = joinRequest.project.ownerId === user.id;
  const isAdmin = membership && membership.status === "ACTIVE" && isProjectAdminRole(membership.role);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // If accepting, check if project is full
  if (status === "ACCEPTED") {
    const activeMemberCount = await db.projectMember.count({
      where: { projectId, status: "ACTIVE" },
    });

    if (activeMemberCount >= joinRequest.project.maxMembers) {
      return NextResponse.json({ error: "Project is full" }, { status: 400 });
    }

    // Add as project member
    await db.projectMember.upsert({
      where: {
        projectId_userId: { projectId, userId: joinRequest.userId },
      },
      create: {
        projectId,
        userId: joinRequest.userId,
        role: "MEMBER",
        status: "ACTIVE",
      },
      update: {
        status: "ACTIVE",
        role: "MEMBER",
      },
    });

    // Add to project group
    try {
      await addProjectGroupMember(
        projectId,
        joinRequest.userId,
        "MEMBER",
        {
          projectId,
          name: joinRequest.project.title,
          creatorId: joinRequest.project.ownerId,
        }
      );
    } catch (groupError) {
      console.error("[join-request] Failed to add user to group", groupError);
      // Continue anyway - they're a project member
    }

    // Notify the requester
    await createNotification({
      userId: joinRequest.userId,
      type: "PROJECT_JOIN_REQUEST_ACCEPTED",
      title: "Join request accepted",
      message: `Your request to join "${joinRequest.project.title}" was accepted.`,
      link: `/projects/${projectId}`,
      actorId: user.id,
      entityType: "PROJECT",
      entityId: projectId,
    });
  } else {
    // Notify rejection
    await createNotification({
      userId: joinRequest.userId,
      type: "PROJECT_JOIN_REQUEST_REJECTED",
      title: "Join request declined",
      message: `Your request to join "${joinRequest.project.title}" was declined.`,
      link: `/projects`,
      actorId: user.id,
      entityType: "PROJECT",
      entityId: projectId,
    });
  }

  // Update request status
  await db.joinRequest.update({
    where: { id: requestId },
    data: { status },
  });

  return NextResponse.json({ success: true, status });
}
