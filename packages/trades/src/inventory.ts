/**
 * A copy the viewer could give, ranked within its collection by serial
 * (1 is the highest), with how many usable copies of that collection they
 * own before any cap.
 */
export type RankedCandidate = {
  tokenId: number;
  serial: number;
  rank: number;
  owned: number;
};

/**
 * Order candidates so allocation spends duplicates first. Every copy but
 * the lowest-serial one of each collection is a spare; spares come before
 * the copies the viewer would be left with, each group by serial, highest
 * first, then token id.
 */
export function orderInventory<T extends RankedCandidate>(
  candidates: readonly T[],
): T[] {
  const isSpare = (candidate: T) => candidate.rank < candidate.owned;
  return candidates.toSorted(
    (a, b) =>
      Number(isSpare(b)) - Number(isSpare(a)) ||
      b.serial - a.serial ||
      a.tokenId - b.tokenId,
  );
}
