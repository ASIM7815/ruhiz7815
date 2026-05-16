import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { deleteFromGCS, extractGCSPath } from "@/lib/gcs";
import { isPlatformAdmin } from "@/lib/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/files/[fileId] — delete file
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  const file = await db.fileAsset.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Only file owner or platform admin can delete
  if (file.userId !== user.id && !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Delete from GCS
  try {
    const gcsPath = extractGCSPath(file.fileUrl);
    if (gcsPath) {
      await deleteFromGCS(gcsPath);
    }
  } catch (gcsError) {
    console.error("[files] Failed to delete from GCS", gcsError);
  }

  // Delete from database
  await db.fileAsset.delete({ where: { id: fileId } });

  return NextResponse.json({ success: true });
}
