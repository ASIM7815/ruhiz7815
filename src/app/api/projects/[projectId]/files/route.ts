import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Storage } from "@google-cloud/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: process.env.GCS_CREDENTIALS
    ? JSON.parse(process.env.GCS_CREDENTIALS)
    : undefined,
});

const bucketName = process.env.GCS_BUCKET_NAME || "";

// GET /api/projects/[projectId]/files — List project files
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verify user is a project member
  const member = await db.projectMember.findFirst({
    where: {
      projectId,
      userId: user.id,
      status: "ACTIVE",
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  // Get all files for this project
  const files = await db.fileAsset.findMany({
    where: {
      entityType: "projectFiles",
      entityId: projectId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    files: files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileUrl: f.fileUrl,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
      createdAt: f.createdAt.toISOString(),
      uploadedBy: f.user,
    })),
  });
}

// POST /api/projects/[projectId]/files — Upload file
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verify user is a project member
  const member = await db.projectMember.findFirst({
    where: {
      projectId,
      userId: user.id,
      status: "ACTIVE",
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a project member" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const gcsPath = `projects/${projectId}/files/${timestamp}-${sanitizedName}`;

    // Upload to GCS
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(gcsPath);
    const buffer = Buffer.from(await file.arrayBuffer());

    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make file publicly accessible
    await blob.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsPath}`;

    // Save to database
    const fileAsset = await db.fileAsset.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileUrl: publicUrl,
        fileSize: file.size,
        mimeType: file.type,
        entityType: "projectFiles",
        entityId: projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: fileAsset.id,
        fileName: fileAsset.fileName,
        fileUrl: fileAsset.fileUrl,
        fileSize: fileAsset.fileSize,
        mimeType: fileAsset.mimeType,
        createdAt: fileAsset.createdAt.toISOString(),
        uploadedBy: fileAsset.user,
      },
    });
  } catch (uploadError) {
    console.error("[files] Upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
