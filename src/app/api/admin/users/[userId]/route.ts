import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/services/permissions";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/services/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/admin/users/[userId] — update user roles/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { platformRole, marketplaceRole, marketplaceStatus } = body;

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Cannot modify own admin status
  if (userId === user.id && platformRole && platformRole !== user.platformRole) {
    return NextResponse.json({ error: "Cannot modify your own admin status" }, { status: 400 });
  }

  const updateData: Record<string, string> = {};
  if (platformRole && ["USER", "MODERATOR", "ADMIN"].includes(platformRole)) {
    updateData.platformRole = platformRole;
  }
  if (marketplaceRole && ["NONE", "BUYER", "SELLER", "VERIFIED_SELLER"].includes(marketplaceRole)) {
    updateData.marketplaceRole = marketplaceRole;
  }
  if (
    marketplaceStatus &&
    ["DISABLED", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"].includes(marketplaceStatus)
  ) {
    updateData.marketplaceStatus = marketplaceStatus;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  }

  await db.user.update({
    where: { id: userId },
    data: updateData,
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: AUDIT_ACTIONS.USER_UPDATED,
    entityType: "USER",
    entityId: userId,
    metadata: updateData,
  });

  return NextResponse.json({ success: true });
}
