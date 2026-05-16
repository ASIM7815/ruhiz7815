import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { isProjectAdminRole } from "@/lib/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/projects/[projectId]/members — list project members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verify user is a member or owner
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId: user.id, status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isMember = project.ownerId === user.id || project.members.length > 0;
  if (!isMember) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const members = await db.projectMember.findMany({
    where: { projectId, status: "ACTIVE" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          uid: true,
          university: true,
          bio: true,
        },
      },
    },
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      image: m.user.image,
      uid: m.user.uid,
      university: m.user.university,
      bio: m.user.bio,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
  });
}
