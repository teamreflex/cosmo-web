import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

/**
 * Encrypt a payload.
 */
export function encrypt(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const iv = randomBytes(16);

  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return Buffer.concat([iv, encrypted]).toString("base64");
}

/**
 * Decrypt a payload.
 */
export function decrypt(payload: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const buffer = Buffer.from(payload, "base64");
  const iv = buffer.subarray(0, 16);
  const ciphertext = buffer.subarray(16);

  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export class EncryptionError extends Error {}
