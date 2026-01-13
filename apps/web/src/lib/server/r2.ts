import { env } from "@/lib/env/server";
import { S3Client } from "bun";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const r2 = new S3Client({
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  bucket: env.R2_BUCKET,
  accessKeyId: env.R2_ACCESS_KEY,
  secretAccessKey: env.R2_SECRET_KEY,
});

type PresignedUrlOptions = {
  key: string;
  contentType: string;
  contentLength: number;
};

/**
 * Generate a presigned URL for uploading to R2.
 */
export function getPresignedUploadUrl(options: PresignedUrlOptions) {
  const { key, contentType, contentLength } = options;

  if (contentLength > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`);
  }

  const uploadUrl = r2.presign(key, {
    method: "PUT",
    expiresIn: 300,
    type: contentType,
  });

  const publicUrl = `${env.R2_DOMAIN}/${key}`;

  return { uploadUrl, publicUrl };
}

/**
 * Generate a unique key for an era image.
 */
export function generateEraImageKey(extension: string): string {
  const uuid = crypto.randomUUID();
  return `era/${uuid}.${extension}`;
}

/**
 * Generate a unique key for an event image.
 */
export function generateEventImageKey(extension: string): string {
  const uuid = crypto.randomUUID();
  return `event/${uuid}.${extension}`;
}
