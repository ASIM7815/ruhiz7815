import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const ownerFilter = searchParams.get("owner");
  const cursor = searchParams.get("cursor");
  const take = 12;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (ownerFilter === "me") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    where.ownerId = session.user.id;
  }

  const projects = await db.project.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, image: true, university: true, uid: true } },
      skills: { select: { skill: true } },
      _count: { select: { members: true } },
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
      memberCount: p._count.members,
      createdAt: p.createdAt,
      skills: p.skills.map((s) => s.skill),
      owner: p.owner,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, problem, description, timeline, maxMembers, skills } = body;

  if (!title || !problem || !description) {
    return NextResponse.json({ error: "Title, problem, and description are required" }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      title,
      problem,
      description,
      timeline: timeline || null,
      maxMembers: maxMembers || 4,
      ownerId: session.user.id,
      skills: {
        create: (skills || []).map((skill: string) => ({ skill })),
      },
      members: {
        create: {
          userId: session.user.id,
          role: "LEADER",
        },
      },
    },
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}
