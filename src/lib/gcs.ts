import { Storage } from "@google-cloud/storage";
import path from "path";

const credentialsEnv = process.env.GCS_CREDENTIALS;

let storage: Storage;

if (credentialsEnv) {
  try {
    const credentials = JSON.parse(credentialsEnv);
    storage = new Storage({ credentials });
  } catch (error) {
    console.error("[GCS] Failed to parse GCS_CREDENTIALS:", error);
    throw new Error("Invalid GCS_CREDENTIALS format. Must be valid JSON.");
  }
} else {
  // Fallback to keyfile for local development
  const keyFilePath = path.join(process.cwd(), "googlebucket.json");
  storage = new Storage({ keyFilename: keyFilePath });
}

const bucketName = process.env.GCS_BUCKET_NAME || "ruhiz";
const bucket = storage.bucket(bucketName);

// Folder structure for organized storage
export const GCS_FOLDERS = {
  KNOWLEDGE_HUB: "knowledge-hub",
  GROUP_CHAT: "group-chat",
  MARKETPLACE: "marketplace",
  PROFILES: "profiles",
  PROJECTS: "projects",
} as const;

/**
 * Upload file to GCS with organized folder structure
 */
export async function uploadToGCS(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: keyof typeof GCS_FOLDERS,
  userId?: string
): Promise<string> {
  try {
    // Create organized path: folder/userId/timestamp-filename
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const folderPath = GCS_FOLDERS[folder];
    const filePath = userId 
      ? `${folderPath}/${userId}/${timestamp}-${sanitizedFileName}`
      : `${folderPath}/${timestamp}-${sanitizedFileName}`;

    const file = bucket.file(filePath);

    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    // Note: Bucket has uniform bucket-level access enabled
    // Files are publicly accessible via bucket-level IAM policy
    // No need to call makePublic() on individual files

    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  } catch (error) {
    console.error("[GCS] Upload failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to upload to GCS: ${message}`);
  }
}

/**
 * Delete file from GCS
 */
export async function deleteFromGCS(filePath: string): Promise<void> {
  try {
    await bucket.file(filePath).delete();
  } catch (error) {
    console.error("Error deleting file from GCS:", error);
    // Don't throw - file might already be deleted
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

/**
 * Get signed URL for temporary access (optional, for private files)
 */
export async function getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
  const file = bucket.file(filePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

/**
 * List files in a specific folder
 */
export async function listFiles(folder: keyof typeof GCS_FOLDERS, userId?: string) {
  const prefix = userId 
    ? `${GCS_FOLDERS[folder]}/${userId}/`
    : `${GCS_FOLDERS[folder]}/`;
  
  const [files] = await bucket.getFiles({ prefix });
  return files.map(file => ({
    name: file.name,
    url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
    size: file.metadata.size,
    contentType: file.metadata.contentType,
    created: file.metadata.timeCreated,
  }));
}
