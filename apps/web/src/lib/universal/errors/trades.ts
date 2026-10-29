import { tokenRefusalReasons } from "@apollo/trades/holdings";
import * as z from "zod";

export const tradeErrorCodes = [
  "listing_not_found",
  "listing_own",
  "listing_closed",
  "listing_updated",
  "listing_pick_unavailable",
  "listing_claim_exists",
  "listing_unavailable",
  "listing_want_unknown",
  "listing_range_empty",
  "listing_bump_too_soon",
  "claim_cap_reached",
  "claim_assignment_invalid",
  "claim_token_unavailable",
  "trade_not_found",
  "trade_status_changed",
  "trade_cancel_started",
  "trade_deadline_passed",
  "trade_own",
  "trade_party_banned",
  "offer_own",
  "offer_unavailable",
  "offer_expired",
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

/**
 * The data a `listing_pick_unavailable` refusal carries when the server can
 * tell which of the poster's objekts the claim picked is no longer free to
 * give. One another claim made live during the claim's own insert goes
 * unnamed.
 */
export const listingPickRefusalSchema = z.object({ tokenId: z.int() });

export type ListingPickRefusal = z.output<typeof listingPickRefusalSchema>;

/**
 * The data an `offer_unavailable` refusal carries when it was one of the
 * other party's picked tokens: which one, never why.
 */
export const offerPartnerTokenRefusalSchema = z.object({ tokenId: z.int() });

export type OfferPartnerTokenRefusal = z.output<
  typeof offerPartnerTokenRefusalSchema
>;
