import { fitsWant, type TradeWant } from "./allocate";
import type { IndexedAttributes } from "./range";

/**
 * Whether the tokens a claimer picked, one list per want row in the
 * listing's order, fit the listing: every row gets exactly its count, no
 * token is used twice, and each token fits its row. `attributes` holds the
 * indexer values of the submitted tokens.
 */
export function validateAssignment(
  wants: readonly TradeWant[],
  rows: readonly (readonly number[])[],
  attributes: ReadonlyMap<number, IndexedAttributes>,
) {
  if (rows.length !== wants.length) return false;

  const seen = new Set<number>();
  for (const [row, want] of wants.entries()) {
    const tokenIds = rows[row] ?? [];
    if (tokenIds.length !== want.count) return false;
    for (const tokenId of tokenIds) {
      const objekt = attributes.get(tokenId);
      if (
        seen.has(tokenId) ||
        objekt === undefined ||
        !fitsWant(want, objekt)
      ) {
        return false;
      }
      seen.add(tokenId);
    }
  }
  return true;
}
