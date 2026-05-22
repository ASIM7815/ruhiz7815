
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/projects/[projectId]/join — submit join request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 500) || null : null;

  // Check project exists
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      ownerId: true,
      status: true,
      maxMembers: true,
      _count: { select: { members: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Can't join your own project
  if (project.ownerId === user.id) {
    return NextResponse.json({ error: "You own this project" }, { status: 400 });
  }

  if (project.status === "COMPLETED") {
    return NextResponse.json({ error: "This project is already completed" }, { status: 400 });
  }

  // Check if already a member
  const existingMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });

  if (existingMember) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  // Check for existing request
  const existingRequest = await db.joinRequest.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });

  if (existingRequest) {
    if (existingRequest.status === "PENDING") {
      return NextResponse.json({
        success: true,
        requestId: existingRequest.id,
        status: "PENDING",
      });
    }
    if (existingRequest.status === "ACCEPTED") {
      // If accepted but not a member, add them as member (data inconsistency fix)
      if (!existingMember) {
        await db.projectMember.create({
          data: { projectId, userId: user.id, role: "MEMBER" },
        });
      }
      return NextResponse.json({ error: "You are already a member of this project" }, { status: 409 });
    }
    if (existingRequest.status === "REJECTED") {
      if (project._count.members >= project.maxMembers) {
        return NextResponse.json({ error: "This project team is already full" }, { status: 409 });
      }

      // Allow re-applying after rejection
      const request = await db.joinRequest.update({
        where: { id: existingRequest.id },
        data: { status: "PENDING", message },
      });

      await db.notification.create({
        data: {
          userId: project.ownerId,
          type: "PROJECT_JOIN_REQUEST",
          title: "New project join request",
          message: `${user.name} asked to join ${project.title}.`,
        },
      });

      return NextResponse.json({ success: true, requestId: request.id, status: "PENDING" });
    }
  }

  if (project._count.members >= project.maxMembers) {
    return NextResponse.json({ error: "This project team is already full" }, { status: 409 });
  }

  const request = await db.joinRequest.create({
    data: { projectId, userId: user.id, message },
  });

  await db.notification.create({
    data: {
      userId: project.ownerId,
      type: "PROJECT_JOIN_REQUEST",
      title: "New project join request",
      message: `${user.name} asked to join ${project.title}.`,
    },
  });

  return NextResponse.json({ success: true, requestId: request.id, status: "PENDING" });
}

// GET /api/projects/[projectId]/join — list join requests (owner only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verify ownership
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== user.id) {
    const member = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      select: { id: true },
    });

    if (member) {
      return NextResponse.json({ status: "MEMBER" });
    }

    const request = await db.joinRequest.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      select: { id: true, status: true },
    });

    return NextResponse.json({
      requestId: request?.id ?? null,
      status: request?.status ?? "NONE",
    });
  }

  const requests = await db.joinRequest.findMany({
    where: { projectId, status: "PENDING" },
    include: {
      user: {
        select: { id: true, name: true, image: true, uid: true, university: true, bio: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
