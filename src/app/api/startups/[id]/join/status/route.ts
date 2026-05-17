import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status: authStatus } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if user is already a member
  const membership = await db.startupMember.findUnique({
    where: {
      startupId_userId: {
        startupId: id,
        userId: user.id,
      },
    },
  });

  if (membership) {
    return NextResponse.json({ status: "accepted" });
  }

  // Check for pending join request
  const joinRequest = await db.startupJoinRequest.findUnique({
    where: {
      startupId_userId: {
        startupId: id,
        userId: user.id,
      },
    },
  });

  if (!joinRequest) {
    return NextResponse.json({ status: "none" });
  }

  return NextResponse.json({ status: joinRequest.status.toLowerCase() });
}
