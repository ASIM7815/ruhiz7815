import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResourceInput {
  title: string;
  description: string | null;
  type: string;
  fileUrl: string | null;
  university: string | null;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { resources } = body as { resources: ResourceInput[] };

    if (!resources || !Array.isArray(resources) || resources.length === 0) {
      return NextResponse.json(
        { error: "Resources array is required" },
        { status: 400 }
      );
    }

    // Validate all resources
    for (const resource of resources) {
      if (!resource.title || !resource.type) {
        return NextResponse.json(
          { error: "All resources must have title and type" },
          { status: 400 }
        );
      }

      if (!["NOTES", "PAPER", "MATERIAL"].includes(resource.type)) {
        return NextResponse.json(
          { error: `Invalid resource type: ${resource.type}` },
          { status: 400 }
        );
      }
    }

    // Batch create resources
    const createdResources = await db.resource.createMany({
      data: resources.map((resource) => ({
        title: resource.title,
        description: resource.description,
        type: resource.type,
        fileUrl: resource.fileUrl,
        university: resource.university,
        authorId: user.id,
      })),
    });

    return NextResponse.json(
      {
        success: true,
        count: createdResources.count,
        message: `${createdResources.count} resources uploaded successfully`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Batch upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload resources" },
      { status: 500 }
    );
  }
}
