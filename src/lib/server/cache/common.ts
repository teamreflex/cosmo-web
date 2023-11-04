import "server-only";
import { kv } from "@vercel/kv";

/**
 * Fetch data from cache and replenish the cache after fetching if empty.
 */
export async function remember<T>(
  key: string,
  expiry: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await kv.get<Awaited<ReturnType<typeof fetcher>>>(`${key}`);

  if (cached === null) {
    console.log(`[redis] Cache miss for ${key}`);
    const data = await fetcher();
    await kv.set(`${key}`, data, {
      ex: expiry,
    });
    return data;
  }

  return cached;
}
