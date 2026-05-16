import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function canAccessProject(projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) return false;
  if (project.ownerId === userId) return true;

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { status: true },
  });

  return member?.status === "ACTIVE";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  if (!(await canAccessProject(projectId, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const tasks = await db.task.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      ...task,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  if (!(await canAccessProject(projectId, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  const task = await db.task.create({
    data: {
      projectId,
      title: title.slice(0, 160),
      description: body.description ? String(body.description).slice(0, 1000) : null,
      assigneeId: body.assigneeId ? String(body.assigneeId) : null,
      status: ["TODO", "IN_PROGRESS", "DONE"].includes(body.status) ? body.status : "TODO",
    },
  });

  return NextResponse.json({ id: task.id }, { status: 201 });
}
