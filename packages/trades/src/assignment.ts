import { type TradeWant, fitsWant } from "./allocate";
import type { ObjektAttributes } from "./range";

export type AssignmentResult =
  | { ok: true }
  // a listing with no wants can never be claimed
  | { ok: false; reason: "no_wants" | "wrong_row_count" }
  | { ok: false; reason: "row_count_mismatch"; row: number }
  | {
      ok: false;
      reason: "repeated_token" | "unknown_token" | "misfit";
      row: number;
      tokenId: number;
    };

/**
 * Check the tokens a claimer picked, one list per want row in the listing's
 * order: every row gets exactly its count, no token is used twice, and each
 * token fits its row. `attributes` holds the indexer values of the submitted
 * tokens. The first fault in row order wins, so the answer is stable.
 */
export function validateAssignment(
  wants: readonly TradeWant[],
  rows: readonly (readonly number[])[],
  attributes: ReadonlyMap<number, ObjektAttributes>,
): AssignmentResult {
  if (wants.length === 0) return { ok: false, reason: "no_wants" };
  if (rows.length !== wants.length) {
    return { ok: false, reason: "wrong_row_count" };
  }

  const seen = new Set<number>();
  for (const [row, want] of wants.entries()) {
    const tokenIds = rows[row] ?? [];
    if (tokenIds.length !== want.count) {
      return { ok: false, reason: "row_count_mismatch", row };
    }
    for (const tokenId of tokenIds) {
      if (seen.has(tokenId)) {
        return { ok: false, reason: "repeated_token", row, tokenId };
      }
      seen.add(tokenId);

      const objekt = attributes.get(tokenId);
      if (objekt === undefined) {
        return { ok: false, reason: "unknown_token", row, tokenId };
      }
      if (!fitsWant(want, objekt)) {
        return { ok: false, reason: "misfit", row, tokenId };
      }
    }
  }
  return { ok: true };
}
