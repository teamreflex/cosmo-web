import * as z from "zod";
import { tokenRefusalReasons } from "../trade-listings";

export const tradeErrorCodes = [
  "listing_not_found",
  "listing_own",
  "listing_closed",
  "listing_claimed",
  "already_claimed",
  "listing_updated",
  "listing_unavailable",
  "listing_want_unknown",
  "listing_range_empty",
  "claim_cap_reached",
  "claim_assignment_invalid",
  "claim_token_unavailable",
] as const;

export type TradeErrorCode = (typeof tradeErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known trade error code.
 */
export function isTradeErrorCode(value: string): value is TradeErrorCode {
  return tradeErrorCodes.some((code) => code === value);
}

/**
 * The data a `claim_token_unavailable` refusal carries when the server can
 * tell which picked token it refused and why. A token another trade made
 * live during the claim's own insert goes unnamed.
 */
export const claimTokenRefusalSchema = z.object({
  tokenId: z.int(),
  reason: z.enum(tokenRefusalReasons),
});

export type ClaimTokenRefusal = z.output<typeof claimTokenRefusalSchema>;
