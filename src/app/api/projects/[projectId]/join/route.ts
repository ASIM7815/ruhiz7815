
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/services/notifications";
import { isProjectAdminRole } from "@/lib/services/permissions";

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
  const message = body.message?.trim()?.slice(0, 500) || null;

  // Check project exists
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, status: true, title: true, maxMembers: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Can't join your own project
  if (project.ownerId === user.id) {
    return NextResponse.json({ error: "You own this project" }, { status: 400 });
  }

  if (project.status !== "OPEN") {
    return NextResponse.json({ error: "This project is not accepting requests" }, { status: 400 });
  }

  // Check if already a member
  const existingMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });

  if (existingMember?.status === "ACTIVE") {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const activeMemberCount = await db.projectMember.count({
    where: { projectId, status: "ACTIVE" },
  });
  if (activeMemberCount >= project.maxMembers) {
    return NextResponse.json({ error: "Project is full" }, { status: 400 });
  }

  // Check for existing request
  const existingRequest = await db.joinRequest.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });

  if (existingRequest) {
    if (existingRequest.status === "PENDING") {
      return NextResponse.json({ error: "Request already pending" }, { status: 409 });
    }
    if (existingRequest.status === "REJECTED") {
      // Allow re-applying after rejection
      await db.joinRequest.update({
        where: { id: existingRequest.id },
        data: { status: "PENDING", message },
      });
      await createNotification({
        userId: project.ownerId,
        type: "PROJECT_JOIN_REQUEST_CREATED",
        title: "Join request received",
        message: `${user.name} requested to join "${project.title}".`,
        link: `/projects/${projectId}/requests`,
        actorId: user.id,
        entityType: "PROJECT",
        entityId: projectId,
      });
      return NextResponse.json({ success: true, status: "PENDING" });
    }
  }

  await db.joinRequest.create({
    data: { projectId, userId: user.id, message },
  });

  await createNotification({
    userId: project.ownerId,
    type: "PROJECT_JOIN_REQUEST_CREATED",
    title: "Join request received",
    message: `${user.name} requested to join "${project.title}".`,
    link: `/projects/${projectId}/requests`,
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
  });

  return NextResponse.json({ success: true, status: "PENDING" });
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
    include: {
      members: {
        where: { userId: user.id, status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  const isAdmin = project && (project.ownerId === user.id || isProjectAdminRole(project.members[0]?.role));
  if (!project || !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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
