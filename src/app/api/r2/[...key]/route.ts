import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getR2Client } from "@/lib/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/r2/[...key]
 *
 * Proxies files stored in Cloudflare R2 to the browser.
 * Since the R2 bucket has no public domain, all uploaded files are served
 * through this endpoint. The URL is stable (no expiry) and cache-friendly.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const objectKey = key.join("/");

  // Prevent path traversal attacks
  if (objectKey.includes("..") || objectKey.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || "ruhiz",
      Key: objectKey,
    });

    const response = await getR2Client().send(command);

    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Buffer the response (files are max 10 MB per upload route)
    const bytes = await response.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": response.ContentType || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(response.ContentDisposition
          ? { "Content-Disposition": response.ContentDisposition }
          : {}),
      },
    });
  } catch (error: unknown) {
    const httpStatus = (error as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    if (httpStatus === 404 || httpStatus === 403) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("[R2 proxy] Error serving file:", objectKey, error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}
