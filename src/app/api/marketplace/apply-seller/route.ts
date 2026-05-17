import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: Submit seller application
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if already a seller or has pending application
  if (user.marketplaceStatus === "ACTIVE") {
    return NextResponse.json(
      { error: "You are already an active seller" },
      { status: 400 }
    );
  }

  if (user.marketplaceStatus === "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "You already have a pending application" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { reason, portfolio, idVerification } = body;

  if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
    return NextResponse.json(
      { error: "Please provide a detailed reason (at least 10 characters)" },
      { status: 400 }
    );
  }

  // Update user marketplace status to PENDING_REVIEW
  await db.user.update({
    where: { id: user.id },
    data: {
      marketplaceStatus: "PENDING_REVIEW",
      marketplaceRole: "BUYER", // Set as buyer while pending
    },
  });

  // Create notification for admins
  const admins = await db.user.findMany({
    where: {
      platformRole: { in: ["ADMIN", "MODERATOR"] },
    },
    select: { id: true },
  });

  // Create notifications for all admins
  if (admins.length > 0) {
    await db.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "SELLER_APPLICATION",
        title: "New seller application",
        message: `${user.name} has applied to become a seller`,
        link: `/admin/marketplace`,
        actorId: user.id,
        entityType: "USER",
        entityId: user.id,
      })),
    });
  }

  // Store application details in a metadata field or separate table
  // For now, we'll just log it
  console.log("[Seller Application]", {
    userId: user.id,
    userName: user.name,
    reason,
    portfolio: portfolio || "N/A",
    idVerification: idVerification || "N/A",
  });

  return NextResponse.json({
    success: true,
    message: "Application submitted successfully",
  });
}
