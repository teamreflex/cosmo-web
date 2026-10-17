import type { ClaimBlock } from "./types";

/**
 * Serials COSMO allocated to a digital collection as a block, then minted
 * as claims over the following months. A block's whole width counts towards
 * the collection's later serials, claimed or not, and each claim takes its
 * position in the block. Find new ones with `scripts/claim-blocks.ts`.
 */
const CLAIM_BLOCKS = new Map<string, readonly ClaimBlock[]>([
  // 400 serials per member, allocated 2026-07-15 in 100-id chunks
  ["atom02-heejin-101z", [{ from: 27651950, to: 27652349 }]],
  ["atom02-haseul-101z", [{ from: 27652403, to: 27652802 }]],
  [
    "atom02-kimlip-101z",
    [
      { from: 27652819, to: 27653018 },
      { from: 27653020, to: 27653219 },
    ],
  ],
  [
    "atom02-jinsoul-101z",
    [
      { from: 27653239, to: 27653538 },
      { from: 27653540, to: 27653639 },
    ],
  ],
  ["atom02-choerry-101z", [{ from: 27653653, to: 27654052 }]],
]);

/**
 * A digital collection's claim blocks, in token-id order.
 */
export function claimBlocks(slug: string): readonly ClaimBlock[] {
  return CLAIM_BLOCKS.get(slug) ?? [];
}
