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
