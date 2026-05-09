import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/projects/[projectId]/join — submit join request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const message = body.message?.trim()?.slice(0, 500) || null;

  // Check project exists
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, status: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Can't join your own project
  if (project.ownerId === session.user.id) {
    return NextResponse.json({ error: "You own this project" }, { status: 400 });
  }

  // Check if already a member
  const existingMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });

  if (existingMember) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  // Check for existing request
  const existingRequest = await db.joinRequest.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
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
      return NextResponse.json({ success: true, status: "PENDING" });
    }
  }

  await db.joinRequest.create({
    data: { projectId, userId: session.user.id, message },
  });

  return NextResponse.json({ success: true, status: "PENDING" });
}

// GET /api/projects/[projectId]/join — list join requests (owner only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verify ownership
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project || project.ownerId !== session.user.id) {
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
