import { kv } from "@vercel/kv";

const KEY = "locked-objekts";

export async function fetchLockedObjekts(userId: number) {
  return (await kv.lrange(`${KEY}:${userId}`, 0, -1)) as number[];
}

export async function lockObjekt(userId: number, tokenId: number) {
  try {
    return (await kv.lpush(`${KEY}:${userId}`, tokenId)) !== undefined;
  } catch (err) {
    return false;
  }
}

export async function unlockObjekt(userId: number, tokenId: number) {
  try {
    return (await kv.lrem(`${KEY}:${userId}`, 1, tokenId)) === 1;
  } catch (err) {
    return false;
  }
}
