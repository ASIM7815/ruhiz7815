import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/services/permissions";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/services/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/reports/[reportId] — update report status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { reportId } = await params;
  const body = await req.json();
  const { status } = body;

  if (!["IN_REVIEW", "RESOLVED", "DISMISSED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await db.report.update({
    where: { id: reportId },
    data: {
      status,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });

  // Create audit log
  await createAuditLog({
    actorId: user.id,
    action: status === "RESOLVED" ? AUDIT_ACTIONS.REPORT_RESOLVED : 
            status === "DISMISSED" ? AUDIT_ACTIONS.REPORT_DISMISSED :
            AUDIT_ACTIONS.REPORT_REVIEWED,
    entityType: "REPORT",
    entityId: reportId,
    metadata: { targetType: report.targetType, targetId: report.targetId, status },
  });

  return NextResponse.json({ success: true });
}
