import { Storage } from "@google-cloud/storage";
import path from "path";

// Folder structure for organized storage
export const GCS_FOLDERS = {
  KNOWLEDGE_HUB: "knowledge-hub",
  GROUP_CHAT: "group-chat",
  MARKETPLACE: "marketplace",
  PROFILES: "profiles",
  PROJECTS: "projects",
} as const;

// Lazy singleton — initialized on first use, NOT at module load time.
// This prevents module-level crashes that would make ALL routes return 500.
let _storage: Storage | null = null;

function getStorage(): Storage {
  if (_storage) return _storage;

  const credentialsEnv = process.env.GCS_CREDENTIALS;

  if (credentialsEnv) {
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(credentialsEnv);
    } catch {
      throw new Error("[GCS] GCS_CREDENTIALS is not valid JSON");
    }

    // Vercel stores env vars as single-line strings — replace literal \n in private key
    if (typeof credentials.private_key === "string" && credentials.private_key.includes("\\n")) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }

    console.log("[GCS] Initializing with credentials for project:", credentials.project_id);
    _storage = new Storage({ credentials, projectId: credentials.project_id as string });
    console.log("[GCS] Storage initialized successfully");
  } else {
    // Local dev fallback: use googlebucket.json keyfile
    console.log("[GCS] No GCS_CREDENTIALS env var — using local keyfile");
    const keyFilePath = path.join(process.cwd(), "googlebucket.json");
    _storage = new Storage({ keyFilename: keyFilePath });
    console.log("[GCS] Storage initialized with keyfile");
  }

  return _storage;
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME || "ruhiz";
  return getStorage().bucket(bucketName);
}

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
  const bucket = getBucket();

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

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

/**
 * Delete file from GCS. Does not throw if the file is already gone.
 */
export async function deleteFromGCS(filePath: string): Promise<void> {
  try {
    await getBucket().file(filePath).delete();
  } catch (error) {
    console.error("[GCS] Error deleting file:", error);
  }
}

/**
 * Extract the GCS object path from a full public URL.
 * Returns null if the URL doesn't belong to this bucket.
 */
export function extractGCSPath(url: string): string | null {
  const bucketName = process.env.GCS_BUCKET_NAME || "ruhiz";
  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return null;
}

/**
 * Get a signed URL for temporary access (for private files).
 */
export async function getSignedUrl(filePath: string, expiresInMinutes = 60): Promise<string> {
  const bucket = getBucket();
  const [url] = await bucket.file(filePath).getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

/**
 * List files in a specific folder.
 */
export async function listFiles(folder: keyof typeof GCS_FOLDERS, userId?: string) {
  const bucket = getBucket();
  const prefix = userId
    ? `${GCS_FOLDERS[folder]}/${userId}/`
    : `${GCS_FOLDERS[folder]}/`;

  const [files] = await bucket.getFiles({ prefix });
  return files.map((file) => ({
    name: file.name,
    url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
    size: file.metadata.size,
    contentType: file.metadata.contentType,
    created: file.metadata.timeCreated,
  }));
}
