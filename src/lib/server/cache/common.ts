import { kv } from "@vercel/kv";

/**
 * Fetch data from cache and replenish the cache after fetching if empty.
 * @param key string
 * @param expiry number
 * @param fetcher () => Promise<T>
 * @returns Promise<T>
 */
export async function remember<T>(
  key: string,
  expiry: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await kv.get<Awaited<ReturnType<typeof fetcher>>>(`${key}`);

  if (cached === null) {
    const data = await fetcher();
    await kv.set(`${key}`, data, {
      ex: expiry,
    });
    return data;
  }

  return cached;
}
