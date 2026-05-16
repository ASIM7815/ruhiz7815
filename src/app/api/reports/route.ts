import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/reports — create a report
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { targetType, targetId, reason, details } = body;

  if (!targetType || !targetId || !reason) {
    return NextResponse.json(
      { error: "targetType, targetId, and reason are required" },
      { status: 400 }
    );
  }

  const validTargetTypes = [
    "USER",
    "PROJECT",
    "GROUP",
    "MESSAGE",
    "LISTING",
    "RESOURCE",
    "STARTUP",
    "STUDY_GROUP",
  ];

  if (!validTargetTypes.includes(targetType)) {
    return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
  }

  // Check for duplicate report
  const existingReport = await db.report.findFirst({
    where: {
      reporterId: user.id,
      targetType,
      targetId,
      status: { in: ["OPEN", "IN_REVIEW"] },
    },
  });

  if (existingReport) {
    return NextResponse.json({ error: "You have already reported this" }, { status: 409 });
  }

  const report = await db.report.create({
    data: {
      reporterId: user.id,
      targetType,
      targetId,
      reason,
      details: details || null,
    },
  });

  return NextResponse.json({ id: report.id }, { status: 201 });
}

// GET /api/reports — list reports (admin only)
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.platformRole !== "ADMIN" && user.platformRole !== "MODERATOR") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "OPEN";
  const targetType = searchParams.get("targetType");

  const where: Record<string, unknown> = { status };
  if (targetType) where.targetType = targetType;

  const reports = await db.report.findMany({
    where,
    include: {
      reporter: {
        select: { id: true, name: true, image: true, uid: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ reports });
}
