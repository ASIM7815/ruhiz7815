import { NextResponse } from "next/server";
import { S3Client, ListBucketsCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };
  const checks = results.checks as Record<string, unknown>;

  // 1. Check env vars
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || "ruhiz";

  checks.envVars = {
    R2_ACCOUNT_ID: accountId ? "Set" : "Missing",
    R2_ACCESS_KEY_ID: accessKeyId ? "Set" : "Missing",
    R2_SECRET_ACCESS_KEY: secretAccessKey ? "Set" : "Missing",
    R2_BUCKET_NAME: bucketName,
  };

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ ...results, error: "Missing R2 env vars" }, { status: 500 });
  }

  // 2. Test R2 connection
  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    checks.bucket = { status: "Bucket accessible", bucketName };
  } catch (error: unknown) {
    checks.bucket = {
      status: "Error",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(results);
}
