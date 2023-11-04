import "server-only";
import { ValidArtist } from "@/lib/universal/cosmo";
import { kv } from "@vercel/kv";

const KEY = "selected-artist";

export async function fetchSelectedArtist(userId: number) {
  return await kv.get<ValidArtist>(`${KEY}:${userId}`);
}

export async function setSelectedArtist(userId: number, artist: ValidArtist) {
  return await kv.set(`${KEY}:${userId}`, artist);
}
