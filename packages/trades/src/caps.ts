/**
 * What a user's claim cap follows: the feedback score of their linked COSMO
 * address, or 0 without one.
 */
export type ClaimStats = {
  score: number;
};

// the scores at which a user may hold one more claim
export const CLAIM_CAP_TIERS = [1, 5, 15, 30, 60] as const;

// the most claims anyone may hold at once
export const CLAIM_CAP_CEILING = 3 + CLAIM_CAP_TIERS.length;

/**
 * How many listings a user may have claimed at once. Open listings aren't
 * capped. A new account may hold 3, and each tier its score reaches adds one,
 * so the first positive rating raises it and a negative score never lowers it.
 */
export function claimCap({ score }: ClaimStats) {
  return 3 + CLAIM_CAP_TIERS.filter((tier) => score >= tier).length;
}

// the most objekts one listing can offer
export const MAX_OFFERED = 20;

// the most rows a listing's trade side can have
export const MAX_WANT_ROWS = 10;

// the most objekts one want row can ask for
export const MAX_PER_ROW = 20;

// the most objekts a listing can ask for across all its rows
export const MAX_TOTAL_WANTED = 30;

// the longest note a listing can carry, matching its column
export const MAX_NOTE_LENGTH = 500;
