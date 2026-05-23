
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
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  const group = await db.studyGroup.findUnique({
    where: { id: groupId },
    include: {
      _count: { select: { members: true } },
      members: {
        where: { role: "LEADER" },
        select: { userId: true },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group._count.members >= group.maxMembers) {
    return NextResponse.json({ error: "Group is full" }, { status: 400 });
  }

  // Check if already a member
  const existingMember = await db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: existingMember.role === "LEADER" ? "You are the leader of this group" : "Already a member" },
      { status: 409 }
    );
  }

  // Check for existing request
  const existingReq = await db.studyGroupJoinRequest.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });

  if (existingReq?.status === "PENDING") {
    return NextResponse.json({ success: true, status: "PENDING" });
  }

  if (existingReq) {
    // Re-apply after rejection
    await db.studyGroupJoinRequest.update({
      where: { id: existingReq.id },
      data: { status: "PENDING" },
    });
  } else {
    await db.studyGroupJoinRequest.create({
      data: { groupId, userId: user.id },
    });
  }

  // Notify group leader(s)
  const leaderIds = group.members.map((m) => m.userId);
  if (leaderIds.length > 0) {
    await db.notification.createMany({
      data: leaderIds.map((leaderId) => ({
        userId: leaderId,
        type: "STUDY_GROUP_JOIN_REQUEST",
        title: "New study group join request",
        message: `${user.name} wants to join your study group "${group.name}".`,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ success: true, status: "PENDING" });
}

// GET: Return viewer’s status (LEADER with requests, or MEMBER/PENDING/NONE)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  const membership = await db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });

  if (membership?.role === "LEADER") {
    const requests = await db.studyGroupJoinRequest.findMany({
      where: { groupId, status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, image: true, uid: true, university: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ role: "LEADER", pendingRequests: requests });
  }

  if (membership?.role === "MEMBER") {
    return NextResponse.json({ role: "MEMBER", status: "MEMBER" });
  }

  const joinReq = await db.studyGroupJoinRequest.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
    select: { status: true },
  });

  return NextResponse.json({ status: joinReq?.status ?? "NONE" });
}
