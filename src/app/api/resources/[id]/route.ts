
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { deleteFromGCS } from "@/lib/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/resources/[id] - Get single resource
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const resource = await db.resource.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          uid: true,
        },
      },
    },
  });

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: resource.id,
    title: resource.title,
    description: resource.description,
    type: resource.type,
    fileUrl: resource.fileUrl,
    university: resource.university,
    rating: resource.rating,
    downloads: resource.downloads,
    createdAt: resource.createdAt.toISOString(),
    author: resource.author,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (resource.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.resource.update({
    where: { id },
    data: { title: title.trim() },
  });

  return NextResponse.json({ id: updated.id, title: updated.title });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (resource.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete file from GCS if present
  if (resource.fileUrl) {
    const bucketName = process.env.GCS_BUCKET_NAME || "ruhiz";
    const prefix = `https://storage.googleapis.com/${bucketName}/`;
    if (resource.fileUrl.startsWith(prefix)) {
      const filePath = resource.fileUrl.slice(prefix.length);
      await deleteFromGCS(filePath);
    }
  }

  await db.resource.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
