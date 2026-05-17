import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Storage } from "@google-cloud/storage";
import { isProjectAdminRole } from "@/lib/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: process.env.GCS_CREDENTIALS
    ? JSON.parse(process.env.GCS_CREDENTIALS)
    : undefined,
});

const bucketName = process.env.GCS_BUCKET_NAME || "";

// DELETE /api/projects/[projectId]/files/[fileId] — Delete file
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, fileId } = await params;

  // Get file
  const file = await db.fileAsset.findUnique({
    where: { id: fileId },
  });

  if (!file || file.entityType !== "projectFiles" || file.entityId !== projectId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Check permissions: file owner or project admin
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId: user.id, status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  const isAdmin =
    project &&
    (project.ownerId === user.id || isProjectAdminRole(project.members[0]?.role));
  const isOwner = file.userId === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "Not authorized to delete this file" },
      { status: 403 }
    );
  }

  try {
    // Extract GCS path from URL
    const url = new URL(file.fileUrl);
    const gcsPath = url.pathname.split(`/${bucketName}/`)[1];

    if (gcsPath) {
      // Delete from GCS
      const bucket = storage.bucket(bucketName);
      await bucket.file(gcsPath).delete().catch((gcsError) => {
        console.error("[files] GCS delete error:", gcsError);
        // Continue even if GCS delete fails
      });
    }

    // Delete from database
    await db.fileAsset.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ success: true });
  } catch (deleteError) {
    console.error("[files] Delete error:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
