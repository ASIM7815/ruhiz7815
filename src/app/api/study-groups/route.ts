
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ensureStudyGroupGroup } from "@/lib/services/study-group-groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await db.studyGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
      members: {
        take: 3,
        include: {
          user: { select: { image: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      description: g.description,
      maxMembers: g.maxMembers,
      memberCount: g._count.members,
      createdAt: g.createdAt.toISOString(),
      avatars: g.members.map((m) => m.user.image || ""),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check that user has uploaded at least 1 resource
  const uploadCount = await db.resource.count({ where: { authorId: user.id } });
  if (uploadCount === 0) {
    return NextResponse.json(
      { error: "You must upload at least 1 resource to the Knowledge Hub before creating a study group." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, subject, description, maxMembers } = body;

  if (!name || !subject) {
    return NextResponse.json({ error: "Name and subject are required" }, { status: 400 });
  }

  const group = await db.studyGroup.create({
    data: {
      name,
      subject,
      description: description || null,
      maxMembers: maxMembers || 10,
      members: {
        create: {
          userId: user.id,
          role: "ADMIN",
        },
      },
    },
  });

  // Create Supabase group for chat
  try {
    await ensureStudyGroupGroup({
      studyGroupId: group.id,
      name: group.name,
      creatorId: user.id,
    });
  } catch (error) {
    console.error("Failed to create study group group:", error);
    // Don't fail the request if group creation fails
  }

  return NextResponse.json({ id: group.id }, { status: 201 });
}
