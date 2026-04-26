import { createHash } from "node:crypto";

/**
 * Redis cache key for a user's pins.
 * Hashing the decoded username to avoid CJK characters.
 */
export function pinCacheKey(value: string) {
  const hash = createHash("md5")
    .update(decodeURIComponent(value.toLowerCase()))
    .digest("hex");
  return `pins:${hash}`;
}
