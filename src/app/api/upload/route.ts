
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToGCS } from "@/lib/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITS: Record<string, number> = {
  avatar: 2 * 1024 * 1024,
  project: 10 * 1024 * 1024,
  note: 10 * 1024 * 1024,
};

const ALLOWED_TYPES: Record<string, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  project: [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  note: [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;
  const entityId = formData.get("entityId") as string | null;

  if (!file || !type || !LIMITS[type]) {
    return NextResponse.json({ error: "Missing file or invalid type" }, { status: 400 });
  }

  if (!ALLOWED_TYPES[type].includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  if (file.size > LIMITS[type]) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "bin";

  let gcsPath: string;
  if (type === "avatar") {
    gcsPath = `avatars/${session.user.id}.${ext}`;
  } else if (type === "project") {
    gcsPath = `projects/${entityId || session.user.id}/${Date.now()}-${file.name}`;
  } else {
    gcsPath = `notes/${entityId || session.user.id}/${Date.now()}-${file.name}`;
  }

  const url = await uploadToGCS(buffer, gcsPath, file.type);
  return NextResponse.json({ url });
}
