import { createHash } from "node:crypto";

/**
 * Get the cache key for the pins of a user.
 * Hashing the decoded username to avoid CJK characters.
 */
export function pinCacheKey(username: string) {
  const hash = createHash("md5")
    .update(decodeURIComponent(username.toLowerCase()))
    .digest("hex");
  return `pins:${hash}`;
}
