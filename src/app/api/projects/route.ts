
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ensureProjectGroup } from "@/lib/services/project-groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const ownerFilter = searchParams.get("owner");
  const cursor = searchParams.get("cursor");
  const take = 12;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (ownerFilter === "me") {
    const { user, error } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    where.ownerId = user.id;
  }

  const projects = await db.project.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, image: true, university: true, uid: true } },
      skills: { select: { skill: true } },
      members: { where: { status: "ACTIVE" }, select: { id: true } },
    },
  });

  const hasMore = projects.length > take;
  const items = hasMore ? projects.slice(0, take) : projects;

  return NextResponse.json({
    projects: items.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      timeline: p.timeline,
      maxMembers: p.maxMembers,
      memberCount: p.members.length,
      createdAt: p.createdAt.toISOString(),
      skills: p.skills.map((s) => s.skill),
      owner: p.owner,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, problem, description, timeline, maxMembers, skills } = body;

  if (!title || !problem || !description) {
    return NextResponse.json({ error: "Title, problem, and description are required" }, { status: 400 });
  }

  const parsedMaxMembers = Math.min(Math.max(Number(maxMembers) || 4, 2), 20);
  const projectSkills = Array.isArray(skills)
    ? skills
        .map((skill) => String(skill).trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  try {
    // Use transaction to ensure project and group are created atomically
    const project = await db.$transaction(async (tx) => {
      // Create project with member
      const newProject = await tx.project.create({
        data: {
          title: String(title).trim(),
          problem: String(problem).trim(),
          description: String(description).trim(),
          timeline: timeline || null,
          maxMembers: parsedMaxMembers,
          ownerId: user.id,
          skills: {
            create: projectSkills.map((skill: string) => ({ skill })),
          },
          members: {
            create: {
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create group for the project
      await ensureProjectGroup({
        projectId: newProject.id,
        name: newProject.title,
        creatorId: user.id,
      });

      return newProject;
    });

    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (error) {
    console.error("[projects] Failed to create project with group", error);
    return NextResponse.json(
      { error: "Project could not be created. Please try again." },
      { status: 500 }
    );
  }
}
