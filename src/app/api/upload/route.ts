import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-middleware";
import { uploadToGCS, GCS_FOLDERS } from "@/lib/gcs";
import { uploadRateLimit } from "@/lib/rate-limit";
import { handleApiError, ValidationError } from "@/lib/api-errors";
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
  try {
    const user = await requireAuth();
    await uploadRateLimit(user.id);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // avatar, project, knowledge, marketplace, directMessage, groupChat
    const entityId = formData.get("entityId") as string | null; // optional: projectId, groupId, etc.

    if (!file || !type || !LIMITS[type]) {
      throw new ValidationError("Missing file or invalid type");
    }

    // Resolve MIME — browsers on Linux sometimes report empty file.type
    const mimeType = resolveMime(file);

    if (!ALLOWED_TYPES[type].includes(mimeType)) {
      throw new ValidationError(`File type "${mimeType}" not allowed for ${type}`);
    }

    if (file.size > LIMITS[type]) {
      const limitMB = (LIMITS[type] / (1024 * 1024)).toFixed(0);
      throw new ValidationError(`File too large. Maximum ${limitMB}MB allowed`);
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
        throw new ValidationError("Invalid upload type");
    }

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
  } catch (error) {
    return handleApiError(error);
  }
}
