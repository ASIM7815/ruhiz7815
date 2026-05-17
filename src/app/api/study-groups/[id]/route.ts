import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/study-groups/[id] - Get study group details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const studyGroup = await db.studyGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              uid: true,
            },
          },
        },
      },
    },
  });

  if (!studyGroup) {
    return NextResponse.json({ error: "Study group not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: studyGroup.id,
    name: studyGroup.name,
    subject: studyGroup.subject,
    description: studyGroup.description,
    maxMembers: studyGroup.maxMembers,
    memberCount: studyGroup.members.length,
    createdAt: studyGroup.createdAt.toISOString(),
    members: studyGroup.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
      uid: m.user.uid,
      role: m.role,
    })),
  });
}
