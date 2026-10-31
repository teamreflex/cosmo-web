export const marketInviteErrorCodes = [
  "market_invite_unavailable",
  "market_invites_exhausted",
] as const;

export type MarketInviteErrorCode = (typeof marketInviteErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known market invite error code.
 */
export function isMarketInviteErrorCode(
  value: string,
): value is MarketInviteErrorCode {
  return marketInviteErrorCodes.some((code) => code === value);
}
