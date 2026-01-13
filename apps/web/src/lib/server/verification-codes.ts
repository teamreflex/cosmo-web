import type { ValidArtist } from "@apollo/cosmo/types/common";
import { redis } from "./cache";

export type VerificationData = {
  code: string;
  userId: number;
  address: string;
  nickname: string;
  artistId: ValidArtist;
};

const VERIFICATION_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Create a key for the verification data.
 */
function createKey(userId: string): string {
  return `cosmo:verify:${userId}`;
}

/**
 * Generate a 6 character verification code.
 */
function generate(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate and store the verification data in the cache.
 */
export async function storeVerification(
  userId: string,
  data: Omit<VerificationData, "code">,
): Promise<string> {
  const code = generate();
  await redis.setex(
    createKey(userId),
    VERIFICATION_TTL,
    JSON.stringify({ ...data, code }),
  );
  return code;
}

/**
 * Get the verification data from the cache.
 */
export async function getVerification(
  userId: string,
): Promise<VerificationData | null> {
  const cached = await redis.get(createKey(userId));
  return cached ? JSON.parse(cached) : null;
}

/**
 * Clear the verification data from the cache.
 */
export async function clearVerification(userId: string): Promise<void> {
  await redis.del(createKey(userId));
}
