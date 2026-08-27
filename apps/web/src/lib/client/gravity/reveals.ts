import type { Reveal } from "./types";

/**
 * One page of the reveal-polling query. The first page is the snapshot taken
 * when the session started; every later page is what landed since the previous
 * poll, so a non-empty one is an on-chain reveal batch.
 */
export type RevealPage = {
  votes: Reveal[];
};

/**
 * The most recent on-chain reveal batch a session has observed.
 */
export type RevealBatch = {
  /** COMO revealed per candidate id, indexed by candidate id. */
  comoPerCandidate: number[];
  revealCount: number;
};

/**
 * COMO per candidate id, indexed by candidate id. Ids with no reveals hold 0.
 */
export function sumComoPerCandidate(reveals: Reveal[]): number[] {
  if (reveals.length === 0) {
    return [];
  }

  const como: number[] = [];
  for (const reveal of reveals) {
    como[reveal.candidateId] = (como[reveal.candidateId] ?? 0) + reveal.amount;
  }

  // sparse ids leave holes, which read as undefined
  return Array.from(como, (amount) => amount ?? 0);
}

/**
 * The last batch to land, which stays current through the empty pages that
 * follow it. Null until a batch lands: page 0 is the session's baseline, so a
 * fresh load has nothing to compare against.
 */
export function findLatestBatch(pages: RevealPage[]): RevealBatch | null {
  for (let index = pages.length - 1; index > 0; index--) {
    const page = pages[index];
    if (page !== undefined && page.votes.length > 0) {
      return {
        comoPerCandidate: sumComoPerCandidate(page.votes),
        revealCount: page.votes.length,
      };
    }
  }

  return null;
}
