import { createDecipheriv, randomBytes, createCipheriv } from "node:crypto";

/**
 * Decrypt an encrypted request.
 */
export function decrypt(encryptedBody: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const data = Buffer.from(encryptedBody, "base64");
  const iv = data.subarray(0, 16);
  const ciphertext = data.subarray(16);

  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

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

export class EncryptionError extends Error {}
