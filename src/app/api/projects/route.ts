
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthUser } from "@/lib/auth/api-middleware";
import { db } from "@/lib/db";
import { handleApiError, successResponse } from "@/lib/api-errors";
import { generalRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const ownerFilter = searchParams.get("owner");
    const cursor = searchParams.get("cursor");
    const take = 12;

    // Optional auth - needed only for "me" filter
    let currentUser = null;
    if (ownerFilter === "me") {
      currentUser = await requireAuth();
      await generalRateLimit(currentUser.id);
    }

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (currentUser && ownerFilter === "me") {
      where.ownerId = currentUser.id;
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

    return successResponse({
      projects: items.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        timeline: p.timeline,
        maxMembers: p.maxMembers,
        memberCount: p._count.members,
        createdAt: p.createdAt.toISOString(),
        skills: p.skills.map((s) => s.skill),
        owner: p.owner,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    await generalRateLimit(user.id);

    const body = await req.json();
    const { title, problem, description, timeline, maxMembers, skills } = body;

    if (!title || !problem || !description) {
      return NextResponse.json(
        { error: "Title, problem, and description are required" },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        title,
        problem,
        description,
        timeline: timeline || null,
        maxMembers: maxMembers || 4,
        ownerId: user.id,
        skills: {
          create: (skills || []).map((skill: string) => ({ skill })),
        },
        members: {
          create: {
            userId: user.id,
            role: "LEADER",
          },
        },
      },
    });

    return successResponse({ id: project.id }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
