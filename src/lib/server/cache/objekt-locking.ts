import { kv } from "@vercel/kv";

const KEY = "locked-objekts";

export async function fetchLockedObjekts(address: string) {
  return (await kv.lrange(`${KEY}:${address}`, 0, -1)) as number[];
}

export async function lockObjekt(address: string, tokenId: number) {
  try {
    return (await kv.lpush(`${KEY}:${address}`, tokenId)) !== undefined;
  } catch (err) {
    return false;
  }
}

export async function unlockObjekt(address: string, tokenId: number) {
  try {
    return (await kv.lrem(`${KEY}:${address}`, 1, tokenId)) === 1;
  } catch (err) {
    return false;
  }
}
