
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const authorFilter = searchParams.get("author");
  const cursor = searchParams.get("cursor");
  const take = 12;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;

  if (authorFilter === "me") {
    const { user, error, status } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    where.authorId = user.id;
  }

  const resources = await db.resource.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, image: true, uid: true } },
    },
  });

  const hasMore = resources.length > take;
  const items = hasMore ? resources.slice(0, take) : resources;

  return NextResponse.json({
    resources: items.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      fileUrl: r.fileUrl,
      university: r.university,
      rating: r.rating,
      downloads: r.downloads,
      createdAt: r.createdAt.toISOString(),
      author: r.author,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function POST(req: NextRequest) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, type, fileUrl, university } = body;

  if (!title || !type) {
    return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
  }

  if (!["NOTES", "PAPER", "MATERIAL"].includes(type)) {
    return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
  }

  const resource = await db.resource.create({
    data: {
      title,
      description: description || null,
      type,
      fileUrl: fileUrl || null,
      university: university || null,
      authorId: user.id,
    },
  });

  return NextResponse.json({ id: resource.id }, { status: 201 });
}
