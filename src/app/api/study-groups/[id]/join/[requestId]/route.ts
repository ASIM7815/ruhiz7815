
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { addStudyGroupGroupMember } from "@/lib/services/study-group-groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { user, error, status: authStatus } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error }, { status: authStatus });
  }

  const { id, requestId } = await params;
  const { status } = await req.json();

  if (!["ACCEPTED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify admin
  const membership = await db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const joinReq = await db.studyGroupJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!joinReq || joinReq.groupId !== id) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  await db.studyGroupJoinRequest.update({
    where: { id: requestId },
    data: { status },
  });

  if (status === "ACCEPTED") {
    // Add member to Prisma
    await db.studyGroupMember.create({
      data: { groupId: id, userId: joinReq.userId },
    });

    // Add member to Supabase group
    try {
      await addStudyGroupGroupMember(id, joinReq.userId);
    } catch (error) {
      console.error("Failed to add member to study group group:", error);
      // Don't fail the request if group member addition fails
    }
  }

  return NextResponse.json({ success: true });
}
