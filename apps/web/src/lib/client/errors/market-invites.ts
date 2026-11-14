import { m } from "@/i18n/messages";
import { isMarketInviteErrorCode } from "@/lib/universal/errors/market-invites";

/**
 * Maps a market invite error code to a localized message, or null when the
 * code is not a known market invite error code.
 */
export function formatMarketInviteError(code: string): string | null {
  if (!isMarketInviteErrorCode(code)) {
    return null;
  }

  switch (code) {
    case "market_invite_unavailable":
      return m.error_market_invite_unavailable();
    case "market_invites_exhausted":
      return m.error_market_invites_exhausted();
    default:
      code satisfies never;
      return null;
  }
}
