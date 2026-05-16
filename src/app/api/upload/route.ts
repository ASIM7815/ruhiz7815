import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { uploadToGCS, GCS_FOLDERS } from "@/lib/gcs";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-server";
import { canCreateMarketplaceListing } from "@/lib/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// File size limits by type
const LIMITS: Record<string, number> = {
  avatar: 2 * 1024 * 1024,        // 2MB for avatars
  project: 10 * 1024 * 1024,      // 10MB for project files
  knowledge: 10 * 1024 * 1024,    // 10MB for knowledge hub
  marketplace: 5 * 1024 * 1024,   // 5MB for marketplace images
  groupChat: 10 * 1024 * 1024,    // 10MB for group chat files
};

// Allowed file types by category
const ALLOWED_TYPES: Record<string, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  marketplace: ["image/jpeg", "image/png", "image/gif", "image/webp"],
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
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null; // avatar, project, knowledge, marketplace, groupChat
  const entityId = formData.get("entityId") as string | null; // optional: projectId, groupId, etc.

  if (!file || !type || !LIMITS[type]) {
    return NextResponse.json({ error: "Missing file or invalid type" }, { status: 400 });
  }

  if (!ALLOWED_TYPES[type].includes(file.type)) {
    return NextResponse.json({ error: `File type ${file.type} not allowed for ${type}` }, { status: 400 });
  }

  if (file.size > LIMITS[type]) {
    const limitMB = (LIMITS[type] / (1024 * 1024)).toFixed(0);
    return NextResponse.json({ error: `File too large. Maximum ${limitMB}MB allowed` }, { status: 400 });
  }

  if (type === "marketplace" && !canCreateMarketplaceListing(user)) {
    return NextResponse.json({ error: "Seller access is not enabled" }, { status: 403 });
  }

  if (type === "project") {
    if (!entityId) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: entityId },
      select: { ownerId: true },
    });
    const member = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: entityId, userId: user.id } },
      select: { status: true },
    });

    if (!project || (project.ownerId !== user.id && member?.status !== "ACTIVE")) {
      return NextResponse.json({ error: "Not authorized to upload to this project" }, { status: 403 });
    }
  }

  if (type === "groupChat") {
    if (!entityId) {
      return NextResponse.json({ error: "Group id is required" }, { status: 400 });
    }

    const { data: participant } = await supabaseAdmin
      .from("group_participants")
      .select("id, role, can_share_media")
      .eq("conversation_id", entityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json({ error: "Not authorized to upload to this group" }, { status: 403 });
    }

    if (!participant.can_share_media && participant.role !== "ADMIN") {
      return NextResponse.json({ error: "Media sharing is disabled for your account in this group" }, { status: 403 });
    }
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
    case "groupChat":
      folder = "GROUP_CHAT";
      break;
    default:
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
  }

  try {
    // Upload to GCS with organized folder structure
    const url = await uploadToGCS(buffer, file.name, file.type, folder, user.id);
    
    // Save file metadata to database
    const fileAsset = await db.fileAsset.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.type,
        entityType: type === "project" ? "projectChat" : type,
        entityId: entityId || null,
      },
    });

    console.log(`[Upload] ${type} file uploaded:`, {
      userId: user.id,
      fileName: file.name,
      size: file.size,
      folder,
      url,
      fileAssetId: fileAsset.id,
    });

    return NextResponse.json({
      id: fileAsset.id,
      url,
      fileName: file.name,
      size: file.size,
    });
  } catch (uploadError) {
    console.error("[Upload] Error uploading file:", uploadError);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
