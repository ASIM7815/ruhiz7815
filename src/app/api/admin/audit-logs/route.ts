import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { isPlatformAdmin } from "@/lib/services/permissions";
import { getRecentAuditLogs } from "@/lib/services/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/audit-logs — list recent audit logs
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const logs = await getRecentAuditLogs(limit);

  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
      actor: log.actor,
    })),
  });
}
