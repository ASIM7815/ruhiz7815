import { Storage } from "@google-cloud/storage";
import path from "path";

const storage = new Storage({
  keyFilename: path.join(process.cwd(), "ruhiz-490414-9c8203239501.json"),
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || "ruhiz");

export async function uploadToGCS(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<string> {
  const file = bucket.file(filePath);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

export async function deleteFromGCS(filePath: string): Promise<void> {
  try {
    await bucket.file(filePath).delete();
  } catch {
    // Ignore if file doesn't exist
  }
}
