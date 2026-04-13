import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFromGCS } from "@/lib/gcs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (resource.authorId !== session.user.id) {
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
