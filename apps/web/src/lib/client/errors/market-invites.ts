import { m } from "@/i18n/messages";
import { isMarketInviteErrorCode } from "@/lib/universal/errors/market-invites";

/**
 * Maps a market invite error code to a localized message, or null when the
 * error is not a known market invite error code.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatMarketInviteError(error: unknown): string | null {
  if (!(error instanceof Error) || !isMarketInviteErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "market_invite_unavailable":
      return m.error_market_invite_unavailable();
    case "market_invites_exhausted":
      return m.error_market_invites_exhausted();
    default:
      error.message satisfies never;
      return null;
  }
}
