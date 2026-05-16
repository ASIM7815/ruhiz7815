import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function canAccessTask(projectId: string, taskId: string, userId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: { ownerId: true },
      },
    },
  });

  if (!task || task.projectId !== projectId) return null;
  if (task.project.ownerId === userId) return task;

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { status: true },
  });

  return member?.status === "ACTIVE" ? task : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, taskId } = await params;
  const task = await canAccessTask(projectId, taskId, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 160);
  if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 1000) : null;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId ? String(body.assigneeId) : null;
  if (body.status !== undefined && ["TODO", "IN_PROGRESS", "DONE"].includes(body.status)) data.status = body.status;

  const updated = await db.task.update({ where: { id: task.id }, data });
  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, taskId } = await params;
  const task = await canAccessTask(projectId, taskId, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await db.task.delete({ where: { id: task.id } });
  return NextResponse.json({ success: true });
}
