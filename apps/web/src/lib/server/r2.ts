import { env } from "@/lib/env/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY,
    secretAccessKey: env.R2_SECRET_KEY,
  },
});

type PresignedUrlOptions = {
  key: string;
  contentType: string;
  contentLength: number;
};

/**
 * Generate a presigned URL for uploading to R2.
 */
export async function getPresignedUploadUrl(options: PresignedUrlOptions) {
  const { key, contentType, contentLength } = options;

  if (contentLength > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`);
  }

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: 300, // 5 minutes
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
