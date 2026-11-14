import type { Reservation, ReservationSpan, ReservedRange } from "./types";

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

/**
 * What is left of a stored range once late mints land in it: the ranges
 * between its bounds and the token ids inside it, which sit between the
 * bounds in token-id order however late they were minted.
 */
export function splitReservation(
  range: ReservedRange,
  lateTokenIds: readonly number[],
): ReservedRange[] {
  return findReservations([
    range.lo,
    ...lateTokenIds
      .filter((tokenId) => tokenId > range.lo && tokenId < range.hi)
      .sort((a, b) => a - b),
    range.hi,
  ]);
}

/**
 * An inclusive token-id range as one range per digit count it spans. Objekt
 * ids are stored as text, and only ids of equal length compare as text in
 * numeric order. A range that ends below its start holds nothing.
 */
export function tokenIdRanges(from: number, to: number) {
  const ranges: { from: number; to: number; digits: number }[] = [];
  for (let start = from; start <= to;) {
    const digits = String(start).length;
    const end = Math.min(to, 10 ** digits - 1);
    ranges.push({ from: start, to: end, digits });
    start = end + 1;
  }
  return ranges;
}

/**
 * A collection's own span in each range (ordered by `lo`) it has objekts in,
 * given its token ids. Ids outside every range are skipped, and spans come in
 * the order the ids first reach their range.
 */
export function reservationSpans(
  ranges: readonly ReservedRange[],
  tokenIds: readonly number[],
): ReservationSpan[] {
  const spans = new Map<number, ReservationSpan>();
  for (const tokenId of tokenIds) {
    const range = findRange(ranges, tokenId);
    if (range !== undefined) {
      const span = spans.get(range.lo) ?? {
        ...range,
        min: tokenId,
        max: tokenId,
      };
      span.min = Math.min(span.min, tokenId);
      span.max = Math.max(span.max, tokenId);
      spans.set(range.lo, span);
    }
  }
  return [...spans.values()];
}

/**
 * The span's range as its collection sees it (see `Reservation`). `between`
 * holds the stored token ids of other collections between the collection's
 * own in any of its spans, `witnessed` is whether another collection has a
 * stored objekt in the range outside the span, and `pending` holds the token
 * ids of other collections' objekts not stored yet.
 */
export function toReservation(
  span: ReservationSpan,
  between: readonly number[],
  witnessed: boolean,
  pending: readonly number[],
): Reservation {
  const foreign = [...between, ...pending].filter(
    (tokenId) => tokenId > span.min && tokenId < span.max,
  );
  return {
    lo: span.lo,
    hi: span.hi,
    shared:
      foreign.length > 0 ||
      witnessed ||
      pending.some((tokenId) => tokenId > span.lo && tokenId < span.hi),
    foreign,
  };
}
