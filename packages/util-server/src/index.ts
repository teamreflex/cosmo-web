import { createHash } from "node:crypto";

/**
 * Redis cache key for a user's pins.
 * Hashing the decoded username to avoid CJK characters. The prefix carries
 * the cached shape's version, so entries in an older shape expire unread.
 */
export function pinCacheKey(value: string) {
  const hash = createHash("md5")
    .update(decodeURIComponent(value.toLowerCase()))
    .digest("hex");
  return `pins:v3:${hash}`;
}

/**
 * Redis cache key for the operator-rotatable COSMO encryption key.
 */
export const cosmoKeyCacheKey = "cosmo-key";

/**
 * Redis key holding the ISO timestamp of the newest block the indexer has
 * applied. Schedules' `sync-processor-head` writes it every minute and the
 * web app's system status reads it.
 */
export const processorHeadKey = "processor-head";
