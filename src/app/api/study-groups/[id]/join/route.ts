
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: Submit a join request
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
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
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 400 });
  }

  // Check existing request
  const existingReq = await db.studyGroupJoinRequest.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (existingReq?.status === "PENDING") {
    return NextResponse.json({ error: "You already have a pending request" }, { status: 400 });
  }

  if (existingReq) {
    await db.studyGroupJoinRequest.update({
      where: { id: existingReq.id },
      data: { status: "PENDING" },
    });
  } else {
    await db.studyGroupJoinRequest.create({
      data: { groupId: id, userId: user.id },
    });
  }

  return NextResponse.json({ success: true, status: "PENDING" });
}

// GET: List pending requests (leader only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if user is a leader
  const membership = await db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!membership || membership.role !== "LEADER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await db.studyGroupJoinRequest.findMany({
    where: { groupId: id, status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, image: true, uid: true, university: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(requests);
}
