
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { addStartupGroupMember } from "@/lib/services/startup-groups";

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

  // Verify founder
  const startup = await db.startup.findUnique({ where: { id } });
  if (!startup || startup.founderId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const joinReq = await db.startupJoinRequest.findUnique({ where: { id: requestId } });
  if (!joinReq || joinReq.startupId !== id) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  await db.startupJoinRequest.update({
    where: { id: requestId },
    data: { status },
  });

  if (status === "ACCEPTED") {
    // Add member to Prisma
    await db.startupMember.create({
      data: { startupId: id, userId: joinReq.userId, role: "MEMBER" },
    });

    // Add member to Supabase group
    try {
      await addStartupGroupMember(id, joinReq.userId);
    } catch (error) {
      console.error("Failed to add member to startup group:", error);
      // Don't fail the request if group member addition fails
    }
  }

  return NextResponse.json({ success: true });
}
