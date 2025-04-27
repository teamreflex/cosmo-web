import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Encrypt a token.
 */
export function encryptToken(token: string, key: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encryptedToken = Buffer.concat([cipher.update(token), cipher.final()]);

  // concatenate the iv, encrypted text and auth tag
  return Buffer.concat([iv, encryptedToken, cipher.getAuthTag()]).toString(
    "base64"
  );
}

/**
 * Decrypt a token.
 */
export function decryptToken(encrypted: string, key: string) {
  // convert the encrypted token to a buffer
  const encryptedBuffer = Buffer.from(encrypted, "base64");

  // pull out individual parts (iv, auth tag, encrypted text)
  const authTag = encryptedBuffer.subarray(-AUTH_TAG_LENGTH);
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const text = encryptedBuffer.subarray(IV_LENGTH, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, "hex"), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(text), decipher.final()]).toString(
    "utf8"
  );
}
