import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

export const GCS_FOLDERS = {
  KNOWLEDGE_HUB: "knowledge-hub",
  GROUP_CHAT:    "group-chat",
  MARKETPLACE:   "marketplace",
  PROFILES:      "profiles",
  PROJECTS:      "projects",
} as const;

let _r2: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_r2) return _r2;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("[R2] Missing env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  }
  _r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _r2;
}

const getBucketName = () => process.env.R2_BUCKET_NAME || "ruhiz";

export async function uploadToGCS(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: keyof typeof GCS_FOLDERS,
  userId?: string
): Promise<string> {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const folderPath = GCS_FOLDERS[folder];
  const key = userId
    ? `${folderPath}/${userId}/${timestamp}-${sanitized}`
    : `${folderPath}/${timestamp}-${sanitized}`;
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    })
  );
  return `/api/r2/${key}`;
}

export async function deleteFromGCS(filePathOrUrl: string): Promise<void> {
  const key = extractGCSPath(filePathOrUrl) ?? filePathOrUrl;
  try {
    await getR2Client().send(
      new DeleteObjectCommand({ Bucket: getBucketName(), Key: key })
    );
  } catch (error) {
    console.error("[R2] Error deleting file:", error);
  }
}

export function extractGCSPath(url: string): string | null {
  if (url.startsWith("/api/r2/")) return url.slice("/api/r2/".length);
  const gcsPrefix = `https://storage.googleapis.com/${getBucketName()}/`;
  if (url.startsWith(gcsPrefix)) return url.slice(gcsPrefix.length);
  return null;
}

export async function getSignedUrl(filePathOrUrl: string, expiresInMinutes = 60): Promise<string> {
  const key = extractGCSPath(filePathOrUrl) ?? filePathOrUrl;
  const command = new GetObjectCommand({ Bucket: getBucketName(), Key: key });
  return awsGetSignedUrl(getR2Client(), command, { expiresIn: expiresInMinutes * 60 });
}

export async function listFiles(folder: keyof typeof GCS_FOLDERS, userId?: string) {
  const prefix = userId
    ? `${GCS_FOLDERS[folder]}/${userId}/`
    : `${GCS_FOLDERS[folder]}/`;
  const response = await getR2Client().send(
    new ListObjectsV2Command({ Bucket: getBucketName(), Prefix: prefix })
  );
  return (response.Contents ?? []).map((obj) => ({
    name: obj.Key ?? "",
    url: `/api/r2/${obj.Key}`,
    size: obj.Size,
    created: obj.LastModified?.toISOString(),
  }));
}
