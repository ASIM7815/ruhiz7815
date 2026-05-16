import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    select: { id: true, ownerId: true, status: true, maxMembers: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId === user.id) {
    return NextResponse.json({
      relationship: "OWNER",
      canRequest: false,
    });
  }

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { id: true, role: true, status: true },
  });

  if (member?.status === "ACTIVE") {
    return NextResponse.json({
      relationship: "MEMBER",
      role: member.role,
      canRequest: false,
    });
  }

  const joinRequest = await db.joinRequest.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { id: true, status: true },
  });

  if (joinRequest?.status === "PENDING") {
    return NextResponse.json({
      relationship: "PENDING",
      requestId: joinRequest.id,
      canRequest: false,
    });
  }

  const activeMemberCount = await db.projectMember.count({
    where: { projectId, status: "ACTIVE" },
  });

  const canRequest = project.status === "OPEN" && activeMemberCount < project.maxMembers;

  return NextResponse.json({
    relationship: joinRequest?.status === "REJECTED" ? "REJECTED" : "NONE",
    requestId: joinRequest?.id || null,
    canRequest,
  });
}
