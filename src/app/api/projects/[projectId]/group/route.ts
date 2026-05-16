import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ensureProjectGroup } from "@/lib/services/project-groups";
import { isProjectAdminRole } from "@/lib/services/permissions";

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
    include: {
      members: {
        where: { userId: user.id, status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membershipRole = project.members[0]?.role || null;
  const allowed = project.ownerId === user.id || !!membershipRole;
  if (!allowed) {
    return NextResponse.json({ error: "Only approved members can open this group" }, { status: 403 });
  }

  const group = await ensureProjectGroup({
    projectId,
    name: project.title,
    creatorId: project.ownerId,
  });

  return NextResponse.json({
    id: group.id,
    name: group.name,
    type: group.type,
    entityId: group.entity_id,
    myProjectRole: project.ownerId === user.id ? "ADMIN" : membershipRole,
    isAdmin: project.ownerId === user.id || isProjectAdminRole(membershipRole),
  });
}
