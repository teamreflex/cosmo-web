import { m } from "@/i18n/messages";
import { objektName } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  type ClaimTokenRefusal,
  claimTokenRefusalSchema,
  isTradeErrorCode,
  listingPickRefusalSchema,
  type OfferPartnerTokenRefusal,
  offerPartnerTokenRefusalSchema,
} from "@/lib/universal/errors/trades";
import {
  type ListingFeedItem,
  type OfferRefusal,
  refusedOfferToken,
  type TokenRefusalReason,
} from "@/lib/universal/trade-listings";

/**
 * Maps a trade error code to a localized message, or null when the error is
 * not a known trade error code.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatTradeError(error: unknown): string | null {
  if (!(error instanceof Error) || !isTradeErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "listing_not_found":
      return m.trade_error_listing_not_found();
    case "listing_own":
      return m.trade_error_listing_own();
    case "listing_closed":
      return m.trade_error_listing_closed();
    case "listing_updated":
      return m.trade_error_listing_updated();
    case "listing_pick_unavailable":
      return m.trade_error_listing_pick_unavailable();
    case "listing_claim_exists":
      return m.trade_error_listing_claim_exists();
    case "listing_unavailable":
      return m.trade_error_listing_unavailable();
    case "listing_want_unknown":
      return m.trade_error_listing_want_unknown();
    case "listing_range_empty":
      return m.trade_error_listing_range_empty();
    case "listing_bump_too_soon":
      return m.trade_error_listing_bump_too_soon();
    case "claim_cap_reached":
      return m.trade_error_claim_cap_reached();
    case "claim_assignment_invalid":
      return m.trade_error_claim_assignment_invalid();
    case "claim_token_unavailable":
      return m.trade_error_claim_token_unavailable();
    case "trade_not_found":
      return m.trade_error_trade_not_found();
    case "trade_status_changed":
      return m.trade_error_trade_status_changed();
    case "trade_cancel_started":
      return m.trade_error_trade_cancel_started();
    case "trade_deadline_passed":
      return m.trade_error_trade_deadline_passed();
    case "trade_own":
      return m.trade_error_trade_own();
    case "trade_party_banned":
      return m.trade_error_trade_party_banned();
    case "offer_own":
      return m.trade_error_offer_own();
    case "offer_unavailable":
      return m.trade_error_offer_unavailable();
    case "offer_expired":
      return m.trade_error_offer_expired();
    default:
      error.message satisfies never;
      return null;
  }
}

/**
 * Why an offered token was refused, naming the objekt (e.g. "HaSeul 310Z")
 * and its serial.
 */
export function formatTokenRefusal(
  reason: TokenRefusalReason,
  token: { objekt: string; serial: number },
) {
  const inputs = tokenInputs(token);

  switch (reason) {
    case "not_owned":
      return m.trade_token_refusal_not_owned(inputs);
    case "untransferable":
      return m.trade_token_refusal_untransferable(inputs);
    case "locked":
      return m.trade_token_refusal_locked({
        ...inputs,
        appName: env.VITE_APP_NAME,
      });
    case "live":
      return m.trade_token_refusal_live(inputs);
  }
}

/**
 * A token on the other party's side of an offer that can't go ahead,
 * without saying why.
 */
export function formatPartnerTokenRefusal(token: {
  objekt: string;
  serial: number;
}) {
  return m.trade_token_refusal_partner(tokenInputs(token));
}

function tokenInputs(token: { objekt: string; serial: number }) {
  return {
    objekt: token.objekt,
    serial: token.serial.toString().padStart(5, "0"),
  };
}

/**
 * The picked token a refused offer names: the caller's own with why, or one
 * on the other party's side without.
 */
export type OfferTokenRefusal =
  | ({ side: "own" } & ClaimTokenRefusal)
  | ({ side: "partner" } & OfferPartnerTokenRefusal);

/**
 * Reads the token a refused offer, counter or accept names, or null when it
 * names none.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function offerTokenRefusal(error: unknown): OfferTokenRefusal | null {
  if (!(error instanceof ExpectedError)) return null;
  switch (error.message) {
    case "claim_token_unavailable": {
      const parsed = claimTokenRefusalSchema.safeParse(error.data);
      return parsed.success ? { side: "own", ...parsed.data } : null;
    }
    case "offer_unavailable": {
      const parsed = offerPartnerTokenRefusalSchema.safeParse(error.data);
      return parsed.success ? { side: "partner", ...parsed.data } : null;
    }
    default:
      return null;
  }
}

/**
 * A refused claim or offer the confirm dialog answers in place: the listing
 * changed since the viewer read it, another trade took one of the pool
 * objekts they picked, or one of their own tokens can't be given (each
 * named when the server could tell which).
 */
export type ClaimFailure =
  | { kind: "updated" }
  | { kind: "pick"; tokenId: number | null }
  | { kind: "token"; refusal: ClaimTokenRefusal | null };

/**
 * Reads a failed claim into what the confirm dialog shows, or null for an
 * error it leaves to a toast.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function claimFailure(error: unknown): ClaimFailure | null {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "listing_updated":
      return { kind: "updated" };
    case "listing_pick_unavailable": {
      const parsed =
        error instanceof ExpectedError
          ? listingPickRefusalSchema.safeParse(error.data)
          : null;
      return {
        kind: "pick",
        tokenId: parsed?.success ? parsed.data.tokenId : null,
      };
    }
    case "claim_token_unavailable": {
      const parsed =
        error instanceof ExpectedError
          ? claimTokenRefusalSchema.safeParse(error.data)
          : null;
      return { kind: "token", refusal: parsed?.success ? parsed.data : null };
    }
    default:
      return null;
  }
}

/**
 * Why the poster can't accept an offer on their listing right now, in the
 * words `$acceptOffer` would refuse it with, told to the poster and naming
 * the objekt the refusal names when the offer shows its serial
 * (refusedOfferToken()): one of their picks that's in another trade, which
 * names the claimer of `holder`'s trade from the listing when that trade
 * holds it, or that they can't give, or one of the claimer's, without why.
 */
export function formatOfferRefusal(
  refusal: OfferRefusal,
  offer: { picks: ListingFeedItem[]; given: ListingFeedItem[] },
  holder: string | null,
) {
  const item = refusedOfferToken(refusal, offer);
  const token =
    item === null
      ? null
      : {
          objekt: objektName(item.collection, item.attributes),
          serial: item.serial,
        };

  switch (refusal.code) {
    case "offer_expired":
      return m.trade_error_offer_expired();
    case "listing_updated":
      return m.trade_error_listing_updated();
    case "cosmo_not_linked":
      return m.auth_error_cosmo_required();
    case "offer_unavailable":
      return token === null
        ? m.trade_error_offer_unavailable()
        : formatPartnerTokenRefusal(token);
    case "listing_pick_unavailable":
      if (token === null) return m.listing_poster_refusal_pick_live();
      return holder === null
        ? m.listing_poster_refusal_pick_elsewhere(tokenInputs(token))
        : m.listing_poster_refusal_pick_with({
            ...tokenInputs(token),
            name: holder,
          });
    case "claim_token_unavailable":
      return token === null
        ? m.listing_poster_refusal_pick_unavailable()
        : formatTokenRefusal(refusal.reason, token);
  }
}
