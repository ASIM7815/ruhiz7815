import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/study-groups/[id]/join/status - Check user's join status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if user is already a member
  const member = await db.studyGroupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: id,
        userId: user.id,
      },
    },
  });

  if (member) {
    return NextResponse.json({
      status: "ACCEPTED",
      isMember: true,
    });
  }

  // Check for pending join request
  const joinRequest = await db.studyGroupJoinRequest.findUnique({
    where: {
      groupId_userId: {
        groupId: id,
        userId: user.id,
      },
    },
  });

  if (joinRequest) {
    return NextResponse.json({
      status: joinRequest.status,
      isMember: false,
    });
  }

  return NextResponse.json({
    status: "NONE",
    isMember: false,
  });
}
