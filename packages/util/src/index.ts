/**
 * lowercases the incoming address
 * necessary due to archives returning addresses in lowercase
 */
export const addr = (address: string) => address.toLowerCase();

/**
 * Check if an address is valid.
 */
export function isAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/g.test(address);
}

/**
 * Nullable string compare.
 */
export function isEqual(a?: string, b?: string) {
  return (
    a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase()
  );
}

/**
 * Addresses that may need special handling.
 */
export const Addresses = {
  NULL: addr("0x0000000000000000000000000000000000000000"),
  SPIN: addr("0xD3D5f29881ad87Bb10C1100e2c709c9596dE345F"),
  OBJEKT: addr("0x99Bb83AE9bb0C0A6be865CaCF67760947f91Cb70"),
  COMO: addr("0xd0EE3ba23a384A8eeFd43f33A957dED60eD12706"),
  GRAVITY: addr("0xF1A787da84af2A6e8227aD87112a21181B7b9b39"),
};

/**
 * Chunk an array into chunks of a given size.
 */
export async function chunk<T>(
  arr: T[],
  chunkSize: number,
  callback: (chunk: T[]) => Promise<void>,
) {
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    await callback(chunk);
  }
}
