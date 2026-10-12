/**
 * The listing page's picks after tapping a copy for a want row: a picked
 * copy leaves the row, and an unpicked one joins it while it has room or,
 * in a full row, replaces the row's last pick.
 */
export function togglePick(
  picks: readonly (readonly number[])[],
  row: number,
  tokenId: number,
  count: number,
) {
  return picks.map((tokenIds, index) => {
    if (index !== row) return [...tokenIds];
    if (tokenIds.includes(tokenId)) {
      return tokenIds.filter((id) => id !== tokenId);
    }
    return tokenIds.length < count
      ? [...tokenIds, tokenId]
      : [...tokenIds.slice(0, -1), tokenId];
  });
}

/**
 * The pick that tapping an unpicked copy would swap out of a full row, or
 * null while the row has room.
 */
export function swapTarget(picked: readonly number[], count: number) {
  return picked.length >= count ? (picked.at(-1) ?? null) : null;
}

/**
 * Whether a row has more copies than its count, so tapping one can swap it
 * in for a pick, which the picker's hint about swapping describes.
 */
export function offersSwap(candidates: readonly unknown[], count: number) {
  return candidates.length > count;
}
