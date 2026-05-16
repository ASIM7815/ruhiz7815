
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { ensureProjectGroup } from "@/lib/services/project-groups";
import { isProjectAdminRole } from "@/lib/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, image: true, university: true, uid: true, reputation: true } },
      skills: { select: { skill: true } },
      members: {
        where: { status: "ACTIVE" },
        include: {
          user: { select: { id: true, name: true, image: true, uid: true } },
        },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: project.id,
    title: project.title,
    problem: project.problem,
    description: project.description,
    status: project.status,
    visibility: project.visibility,
    timeline: project.timeline,
    maxMembers: project.maxMembers,
    createdAt: project.createdAt.toISOString(),
    skills: project.skills.map((s) => s.skill),
    owner: project.owner,
    members: project.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
      uid: m.user.uid,
      role: m.role,
    })),
    tasks: project.tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function PATCH(
  req: NextRequest,
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

  const isAdmin = project.ownerId === user.id || isProjectAdminRole(project.members[0]?.role);
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 140);
  if (body.problem !== undefined) data.problem = String(body.problem).trim().slice(0, 2000);
  if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 5000);
  if (body.timeline !== undefined) data.timeline = body.timeline ? String(body.timeline).trim().slice(0, 80) : null;
  if (body.maxMembers !== undefined) data.maxMembers = Math.min(Math.max(Number(body.maxMembers) || 4, 2), 20);
  if (body.status !== undefined && ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"].includes(body.status)) {
    data.status = body.status;
  }
  if (body.visibility !== undefined && ["PUBLIC", "PRIVATE", "UNLISTED"].includes(body.visibility)) {
    data.visibility = body.visibility;
  }

  if (Object.keys(data).length === 0 && !Array.isArray(body.skills)) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    const nextProject = await tx.project.update({
      where: { id: projectId },
      data,
    });

    if (Array.isArray(body.skills)) {
      await tx.projectSkill.deleteMany({ where: { projectId } });
      const skills = body.skills
        .map((skill: unknown) => String(skill).trim())
        .filter(Boolean)
        .slice(0, 10);

      if (skills.length > 0) {
        await tx.projectSkill.createMany({
          data: skills.map((skill: string) => ({ projectId, skill })),
        });
      }
    }

    return nextProject;
  });

  if (data.title) {
    await ensureProjectGroup({
      projectId,
      name: updated.title,
      creatorId: project.ownerId,
    }).catch((groupError) => {
      console.error("[projects] Failed to sync project group after update", groupError);
    });
  }

  return NextResponse.json({ success: true, id: updated.id });
}

export async function DELETE(
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
    select: { ownerId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== user.id) {
    return NextResponse.json({ error: "Only the creator can archive this project" }, { status: 403 });
  }

  await db.project.update({
    where: { id: projectId },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ success: true, status: "ARCHIVED" });
}
