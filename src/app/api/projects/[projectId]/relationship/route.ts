import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/projects/[projectId]/relationship — get user's relationship to project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      status: true,
      maxMembers: true,
      members: {
        where: { status: "ACTIVE" },
        select: { userId: true, role: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check if owner
  if (project.ownerId === user.id) {
    return NextResponse.json({
      relationship: "OWNER",
      canRequest: false,
      canAccess: true,
    });
  }

  // Check if member
  const membership = project.members.find((m) => m.userId === user.id);
  if (membership) {
    return NextResponse.json({
      relationship: "MEMBER",
      role: membership.role,
      canRequest: false,
      canAccess: true,
    });
  }

  // Check for join request
  const joinRequest = await db.joinRequest.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { id: true, status: true },
  });

  if (joinRequest) {
    if (joinRequest.status === "PENDING") {
      return NextResponse.json({
        relationship: "PENDING",
        requestId: joinRequest.id,
        canRequest: false,
        canAccess: false,
      });
    }
    if (joinRequest.status === "REJECTED") {
      return NextResponse.json({
        relationship: "REJECTED",
        requestId: joinRequest.id,
        canRequest: true, // Allow re-applying
        canAccess: false,
      });
    }
  }

  // Check if project is accepting requests
  const canRequest = project.status === "OPEN" && project.members.length < project.maxMembers;

  return NextResponse.json({
    relationship: "NONE",
    canRequest,
    canAccess: false,
  });
}
