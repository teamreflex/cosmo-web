/**
 * A user's trading record, which their claim cap will follow.
 */
export type ClaimStats = {
  positive: number;
  abandoned: number;
};

/**
 * How many listings a user may have claimed at once. Open listings aren't
 * capped. Fixed until feedback exists to scale it.
 */
export function claimCap(_stats: ClaimStats) {
  return 3;
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
