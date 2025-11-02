/**
 * lowercases the incoming address
 * necessary due to archives returning addresses in lowercase
 */
export const addr = (address: string) => address.toLowerCase();

/**
 * Chunk an array into chunks of a given size.
 */
export async function chunk<T>(
  arr: T[],
  chunkSize: number,
  callback: (chunk: T[]) => Promise<void>
) {
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    await callback(chunk);
  }
}
