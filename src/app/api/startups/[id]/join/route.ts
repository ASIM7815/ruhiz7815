import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST: Submit join request
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const startup = await db.startup.findUnique({ where: { id } });
  if (!startup) {
    return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  }

  // Check if already a member
  const existing = await db.startupMember.findUnique({
    where: { startupId_userId: { startupId: id, userId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 400 });
  }

  // Check existing request
  const existingReq = await db.startupJoinRequest.findUnique({
    where: { startupId_userId: { startupId: id, userId: session.user.id } },
  });
  if (existingReq?.status === "PENDING") {
    return NextResponse.json({ error: "You already have a pending request" }, { status: 400 });
  }

  if (existingReq) {
    await db.startupJoinRequest.update({
      where: { id: existingReq.id },
      data: { status: "PENDING", message: null },
    });
  } else {
    await db.startupJoinRequest.create({
      data: { startupId: id, userId: session.user.id },
    });
  }

  return NextResponse.json({ success: true, status: "PENDING" });
}

// GET: List pending requests (founder only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const startup = await db.startup.findUnique({ where: { id } });
  if (!startup || startup.founderId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await db.startupJoinRequest.findMany({
    where: { startupId: id, status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, image: true, uid: true, university: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(requests);
}
