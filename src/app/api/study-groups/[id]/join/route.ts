import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const group = await db.studyGroup.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group._count.members >= group.maxMembers) {
    return NextResponse.json({ error: "Group is full" }, { status: 400 });
  }

  // Check if already a member
  const existing = await db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 400 });
  }

  await db.studyGroupMember.create({
    data: {
      groupId: id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
