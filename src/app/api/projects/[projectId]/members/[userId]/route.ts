import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { isProjectAdminRole } from "@/lib/services/permissions";
import { removeProjectGroupMember } from "@/lib/services/project-groups";
import { createNotification } from "@/lib/services/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/projects/[projectId]/members/[userId] — change member role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, userId } = await params;

  // Verify admin permission
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

  // Cannot change own role
  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  // Cannot change owner's role
  if (userId === project.ownerId) {
    return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 });
  }

  const body = await req.json();
  const newRole = String(body.role || "").toUpperCase();

  if (!["ADMIN", "MEMBER"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!member || member.status !== "ACTIVE") {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await db.projectMember.update({
    where: { id: member.id },
    data: { role: newRole },
  });

  await createNotification({
    userId,
    type: "PROJECT_ROLE_CHANGED",
    title: "Role updated",
    message: `Your role in "${project.title}" was changed to ${newRole}.`,
    link: `/projects/${projectId}`,
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
  });

  return NextResponse.json({ success: true, role: newRole });
}

// DELETE /api/projects/[projectId]/members/[userId] — remove member
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, userId } = await params;

  // Verify admin permission
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { status: "ACTIVE" },
        select: { userId: true, role: true },
      },
    },
  });

  const currentUserMember = project?.members.find((m) => m.userId === user.id);
  const isAdmin =
    project && (project.ownerId === user.id || isProjectAdminRole(currentUserMember?.role));

  if (!project || !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Cannot remove self
  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot remove yourself. Use leave instead." }, { status: 400 });
  }

  // Cannot remove owner
  if (userId === project.ownerId) {
    return NextResponse.json({ error: "Cannot remove project owner" }, { status: 400 });
  }

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { user: { select: { name: true } } },
  });

  if (!member || member.status !== "ACTIVE") {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Check if removing last admin (excluding owner)
  const adminCount = project.members.filter(
    (m) => m.userId !== project.ownerId && isProjectAdminRole(m.role)
  ).length;

  if (isProjectAdminRole(member.role) && adminCount <= 1) {
    return NextResponse.json(
      { error: "Cannot remove the last admin. Promote another member first." },
      { status: 400 }
    );
  }

  // Remove from project
  await db.projectMember.update({
    where: { id: member.id },
    data: { status: "REMOVED", removedAt: new Date() },
  });

  // Remove from group
  try {
    await removeProjectGroupMember(projectId, userId);
  } catch (groupError) {
    console.error("[members] Failed to remove from group", groupError);
  }

  await createNotification({
    userId,
    type: "PROJECT_MEMBER_REMOVED",
    title: "Removed from project",
    message: `You were removed from "${project.title}".`,
    link: `/projects`,
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
  });

  return NextResponse.json({ success: true });
}
