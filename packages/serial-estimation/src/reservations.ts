import type { ReservedRange } from "./types";

/**
 * The smallest jump between consecutive online mints that counts as a
 * reservation. COSMO reserves at least 50 ids at a time, while ids it skips
 * for other reasons (lost serials, burned test mints) leave gaps of a few.
 */
export const RESERVATION_MIN_GAP = 20;

/**
 * The reserved ranges between consecutive online mints of digital
 * collections numbered in token-id order, given their token ids in ascending
 * order.
 */
export function findReservations(
  onlineTokenIds: readonly number[],
  minGap = RESERVATION_MIN_GAP,
): ReservedRange[] {
  const ranges: ReservedRange[] = [];
  for (let index = 1; index < onlineTokenIds.length; index++) {
    const lo = onlineTokenIds[index - 1];
    const hi = onlineTokenIds[index];
    if (lo !== undefined && hi !== undefined && hi - lo >= minGap) {
      ranges.push({ lo, hi });
    }
  }
  return ranges;
}

/**
 * The range in `sorted` (ordered by `lo`) holding the token id.
 */
export function findRange<T extends ReservedRange>(
  sorted: readonly T[],
  tokenId: number,
): T | undefined {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = sorted[middle];
    if (range === undefined) {
      return undefined;
    }
    if (tokenId <= range.lo) {
      high = middle - 1;
    } else if (tokenId >= range.hi) {
      low = middle + 1;
    } else {
      return range;
    }
  }
  return undefined;
}
