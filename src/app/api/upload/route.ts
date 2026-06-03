import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { uploadToGCS, GCS_FOLDERS } from "@/lib/gcs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Extension → MIME fallback (for Linux/some browsers that report empty file.type)
const EXT_MIME: Record<string, string> = {
  ".pdf":  "application/pdf",
  ".zip":  "application/zip",
  ".doc":  "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt":  "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt":  "text/plain",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".gif":  "image/gif",
  ".webp": "image/webp",
};

function resolveMime(file: File): string {
  if (file.type) return file.type;
  const ext = path.extname(file.name).toLowerCase();
  return EXT_MIME[ext] ?? "application/octet-stream";
}

// File size limits by type
const LIMITS: Record<string, number> = {
  avatar: 10 * 1024 * 1024,       // 10MB for avatars and cover images (high-res PNG)
  project: 10 * 1024 * 1024,      // 10MB for project files
  knowledge: 10 * 1024 * 1024,    // 10MB for knowledge hub
  marketplace: 5 * 1024 * 1024,   // 5MB for marketplace images
  directMessage: 10 * 1024 * 1024, // 10MB for direct message files
  groupChat: 10 * 1024 * 1024,    // 10MB for group chat files
};

// Allowed file types by category
const ALLOWED_TYPES: Record<string, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  marketplace: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  directMessage: [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
  ],
  groupChat: [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
  ],
  project: [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
  ],
  knowledge: [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
  ],
};

export async function POST(req: NextRequest) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null; // avatar, project, knowledge, marketplace, directMessage, groupChat
  const entityId = formData.get("entityId") as string | null; // optional: projectId, groupId, etc.

  if (!file || !type || !LIMITS[type]) {
    return NextResponse.json({ error: "Missing file or invalid type" }, { status: 400 });
  }

  // Resolve MIME — browsers on Linux sometimes report empty file.type
  const mimeType = resolveMime(file);

  if (!ALLOWED_TYPES[type].includes(mimeType)) {
    return NextResponse.json({ error: `File type "${mimeType}" not allowed for ${type}` }, { status: 400 });
  }

  if (file.size > LIMITS[type]) {
    const limitMB = (LIMITS[type] / (1024 * 1024)).toFixed(0);
    return NextResponse.json({ error: `File too large. Maximum ${limitMB}MB allowed` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Map upload type to GCS folder
  let folder: keyof typeof GCS_FOLDERS;
  switch (type) {
    case "avatar":
      folder = "PROFILES";
      break;
    case "project":
      folder = "PROJECTS";
      break;
    case "knowledge":
      folder = "KNOWLEDGE_HUB";
      break;
    case "marketplace":
      folder = "MARKETPLACE";
      break;
    case "directMessage":
      folder = "DIRECT_MESSAGES";
      break;
    case "groupChat":
      folder = "GROUP_CHAT";
      break;
    default:
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
  }

  try {
    // Upload to GCS — use resolved mimeType (handles empty file.type)
    const url = await uploadToGCS(buffer, file.name, mimeType, folder, user.id);
    
    console.log(`[Upload] ${type} file uploaded:`, {
      userId: user.id,
      fileName: file.name,
      mimeType,
      size: file.size,
      folder,
      url,
    });

    return NextResponse.json({ url, fileName: file.name, size: file.size, mimeType });
  } catch (uploadError) {
    console.error("[Upload] Error uploading file:", uploadError);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
