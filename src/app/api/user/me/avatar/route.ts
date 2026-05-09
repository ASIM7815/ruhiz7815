
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { uploadToGCS, deleteFromGCS } from "@/lib/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const { user, error, status } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    // Delete old avatar if it's a GCS URL (best-effort, don't fail upload if this errors)
    try {
      const currentUser = await db.user.findUnique({
        where: { id: user.id },
        select: { image: true },
      });
      if (currentUser?.image?.includes("storage.googleapis.com")) {
        const oldPath = currentUser.image.split(`/${process.env.GCS_BUCKET_NAME || "ruhiz"}/`)[1];
        if (oldPath) await deleteFromGCS(oldPath);
      }
    } catch (deleteErr) {
      console.warn("[avatar] Failed to delete old avatar:", deleteErr);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToGCS(buffer, file.name, file.type, "PROFILES", user.id);

    await db.user.update({
      where: { id: user.id },
      data: { image: url },
    });

    return NextResponse.json({ image: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[avatar] Upload failed:", message);
    return NextResponse.json({ error: "Upload failed", detail: message }, { status: 500 });
  }
}
