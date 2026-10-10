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
