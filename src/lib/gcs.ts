import { Storage } from "@google-cloud/storage";
import path from "path";

const credentialsEnv = process.env.GCS_CREDENTIALS;
const storage = credentialsEnv
  ? new Storage({ credentials: JSON.parse(credentialsEnv) })
  : new Storage({ keyFilename: path.join(process.cwd(), "ruhiz-490414-9c8203239501.json") });

const bucketName = process.env.GCS_BUCKET_NAME || "ruhiz";
const bucket = storage.bucket(bucketName);

export async function uploadToGCS(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<string> {
  const file = bucket.file(filePath);
  await file.save(buffer, {
    contentType,
    resumable: false,
    public: true,
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  // Try object-level ACL (fine-grained access); skip if uniform bucket-level access is enabled
  try {
    await file.makePublic();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("uniform bucket-level access")) {
      // Bucket uses uniform access – public read must be granted via bucket IAM policy
      console.info("[GCS] Uniform bucket-level access enabled; skipping makePublic()");
    } else {
      console.warn("[GCS] makePublic() failed:", msg);
    }
  }

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

export async function deleteFromGCS(filePath: string): Promise<void> {
  try {
    await bucket.file(filePath).delete();
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Extract the GCS object path from a full public URL.
 * Returns null if the URL doesn't belong to this bucket.
 */
export function extractGCSPath(url: string): string | null {
  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return null;
}
