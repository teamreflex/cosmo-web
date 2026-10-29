import { validOnlineTypes } from "@apollo/cosmo/types/common";
import { liveTradeStatuses } from "@apollo/database/web/types";
import {
  listingOfferRefusal,
  type OfferedToken,
  type TradeWant,
} from "@apollo/trades/allocate";
import {
  firstRefusal,
  type TokenFlags,
  type TokenOwnership,
  type TokenRefusal,
  tokenRefusal,
  type TokenRefusalReason,
} from "@apollo/trades/holdings";
import { takesOffers } from "@apollo/trades/lifecycle";
import type {
  IndexedAttributes,
  ObjektAttributes,
  RangeFilter,
} from "@apollo/trades/range";
import * as z from "zod";
import type { PublicUser } from "./auth";
import type { AuthErrorCode } from "./errors/auth";
import { ExpectedError } from "./errors/expected";
import type {
  ClaimTokenRefusal,
  ListingPickRefusal,
  OfferPartnerTokenRefusal,
  TradeErrorCode,
} from "./errors/trades";
import type { FeedbackRep } from "./feedback";
import type { Objekt } from "./objekt-conversion";
import type { ListingFeedCursor } from "./schema/listing-feed";
import type { TradeDispute, TradeParty } from "./trades";

export type { TokenRefusal, TokenRefusalReason } from "@apollo/trades/holdings";

/**
 * A posting or edit is refused over one offered token (TokenRefusal) by
 * returning it rather than throwing, so the composer can name the objekt
 * and serial.
 */
export type ListingWriteResult =
  { kind: "saved"; listingId: string } | TokenRefusal;

// the collection values an exact row, a choice row's option and an objekt item copy
const collectionValues = {
  slug: z.string(),
  artist: z.string(),
  member: z.string(),
  season: z.string(),
  class: z.string(),
  onOffline: z.string(),
};

/**
 * A want row as stored, parsed into its kind's shape, with a choice row's
 * collections read alongside it (`options`, in slug order). The table's
 * CHECK keeps every kind's columns filled, so a parse failure means the
 * schema and this parser have drifted apart.
 */
export const storedWantSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("exact"), count: z.int(), ...collectionValues })
    .transform(({ kind, count, ...objekt }) => ({ kind, count, objekt })),
  z
    .object({
      kind: z.literal("range"),
      count: z.int(),
      artists: z.array(z.string()),
      members: z.array(z.string()),
      seasons: z.array(z.string()),
      classes: z.array(z.string()),
      onOfflines: z.array(z.enum(validOnlineTypes)),
      collectionNos: z.array(z.string()),
    })
    .transform(({ kind, count, ...range }) => ({
      kind,
      count,
      filter: {
        artist: range.artists,
        member: range.members,
        collectionNo: range.collectionNos,
        season: range.seasons,
        class: range.classes,
        on_offline: range.onOfflines,
      } satisfies RangeFilter,
    })),
  z.object({
    kind: z.literal("choice"),
    count: z.int(),
    options: z.array(z.object(collectionValues)),
  }),
  z.object({
    kind: z.literal("payment"),
    amount: z.string(),
    currency: z.string(),
  }),
]);

export type StoredWant = z.output<typeof storedWantSchema>;

/**
 * A stored want objekts fill, as allocation and the assignment check read
 * it.
 */
export function toTradeWant(
  want: Exclude<StoredWant, { kind: "payment" }>,
): TradeWant {
  switch (want.kind) {
    case "exact":
      return { kind: "exact", slug: want.objekt.slug, count: want.count };
    case "range":
      return { kind: "range", filter: want.filter, count: want.count };
    case "choice":
      return {
        kind: "choice",
        slugs: want.options.map((option) => option.slug),
        count: want.count,
      };
  }
}

/**
 * The want rows objekts fill, in order, leaving out payment rows.
 */
export function tradeWants(wants: readonly StoredWant[]) {
  return wants.flatMap((want) =>
    want.kind === "payment" ? [] : [toTradeWant(want)],
  );
}

/**
 * An objekt item as stored, with the collection values it copied.
 */
export const storedObjektItemSchema = z
  .object({ tokenId: z.int(), ...collectionValues })
  .transform(({ tokenId, ...attributes }) => ({ tokenId, attributes }));

/**
 * An offered objekt in the feed. The serial comes from the indexer and the
 * collection from the slug the listing copied, so a token the indexer has
 * lost still shows its collection, or its copied values without one.
 */
export type ListingFeedItem = {
  tokenId: number;
  serial: number | null;
  attributes: ObjektAttributes;
  collection: Objekt.Collection | null;
};

/**
 * A want row in the feed, in posted order. Exact rows, and each collection
 * of a choice row, carry their collection for the thumbnail and number.
 */
export type ListingFeedWant =
  | (Extract<StoredWant, { kind: "exact" }> & {
      collection: Objekt.Collection | null;
    })
  | (Omit<Extract<StoredWant, { kind: "choice" }>, "options"> & {
      options: (ObjektAttributes & { collection: Objekt.Collection | null })[];
    })
  | Extract<StoredWant, { kind: "range" | "payment" }>;

/**
 * An open listing in the feed, with its poster's rating, null without a
 * visible rating or a poster. `items` is its pool, `unitSize` how many of
 * them one trade takes for the want rows at their counts, `posted` how
 * many objekts it has ever offered (the pool and the ones that left it),
 * and `free` how many no live trade holds and the poster hasn't locked,
 * which may be fewer than `unitSize`, even 0, while trades or locks hold
 * the rest.
 */
export type ListingFeedRow = {
  id: string;
  createdAt: Date;
  poster: PublicUser | null;
  cosmoUsername: string | null;
  rep: FeedbackRep | null;
  items: ListingFeedItem[];
  wants: ListingFeedWant[];
  unitSize: number;
  posted: number;
  free: number;
};

/**
 * Whether a listing reads as a ratio rather than a bundle: one trade takes
 * fewer objekts than it has ever offered (`posted`, the pool and the ones
 * that left it). A ratio listing whose pool is down to one trade's worth
 * still reads as its ratio, and a listing of one objekt never does.
 */
export function hasRatio(unitSize: number, posted: number) {
  return unitSize < posted;
}

export type ListingFeedPage = {
  rows: ListingFeedRow[];
  nextCursor: ListingFeedCursor | undefined;
};

/**
 * Where a listing stands, parsed from the listing row and its trades. A
 * filled listing names the COSMO account its latest completed trade went
 * to and how many of its trades completed. Listings never expire, so there
 * is no expired state, and no claim takes a whole listing: nothing writes
 * `timed_out`, which only listings that closed when their one trade timed
 * out hold.
 */
export const listingStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("open") }),
  z.object({
    status: z.literal("filled"),
    endedAt: z.date(),
    counterparty: z.string().nullable(),
    trades: z.int(),
  }),
  z.object({
    status: z.enum(["withdrawn", "broken", "removed", "timed_out"]),
    endedAt: z.date(),
  }),
]);

export type ListingState = z.output<typeof listingStateSchema>;
export type ClosedListingState = Exclude<ListingState, { status: "open" }>;

/**
 * Why a pool objekt the poster can't give right now is held back: it left
 * their account (or the indexer lost it), COSMO won't transfer it, or they
 * locked it.
 */
export type PoolBlockReason = "moved" | "untransferable" | "locked";

/**
 * Where one of a listing's offered objekts stands:
 * - `free`: the poster can give it, so a claim can pick it;
 * - `in_trade`: a live trade holds it;
 * - `traded`: it left the pool `at` then, given in a trade or gone from the
 *   poster, and stays on the listing as its history;
 * - `blocked`: still in the pool, but the poster can't give it now.
 */
export type PoolAvailability =
  | { kind: "free" }
  | { kind: "in_trade" }
  | { kind: "traded"; at: Date }
  | { kind: "blocked"; reason: PoolBlockReason };

/**
 * A token as the indexer has it, which judging a pool objekt or an offer
 * reads: missing when the indexer doesn't know the id.
 */
type IndexedToken =
  | Extract<TokenOwnership, { kind: "missing" }>
  | (Extract<TokenOwnership, { kind: "found" }> & {
      attributes: IndexedAttributes;
    });

/**
 * Where a listing's objekt stands (PoolAvailability): a row with `leftAt`
 * has left the pool; a live one is in a trade whoever holds it now, since
 * the poster sending it in that trade moves it before the drain drops it;
 * the rest are free unless the poster can't give them (tokenRefusal).
 */
export function poolAvailability(
  item: { tokenId: number; leftAt: Date | null },
  state: IndexedToken | undefined,
  fromAddress: string,
  flags: TokenFlags,
): PoolAvailability {
  if (item.leftAt !== null) return { kind: "traded", at: item.leftAt };
  const reason = flags.live.has(item.tokenId)
    ? "live"
    : tokenRefusal(
        state ?? { kind: "missing", tokenId: item.tokenId },
        fromAddress,
        flags,
      );
  switch (reason) {
    case null:
      return { kind: "free" };
    case "live":
      return { kind: "in_trade" };
    case "not_owned":
      return { kind: "blocked", reason: "moved" };
    case "untransferable":
    case "locked":
      return { kind: "blocked", reason };
  }
}

/**
 * An offered objekt on the listing page, with where it stands.
 */
export type ListingItem = ListingFeedItem & { availability: PoolAvailability };

/**
 * What stops every claim on an open listing right now:
 * - `blocked`: a fault on the poster's side. Their account or terms refuse
 *   any claim (posterBlocked()), or fewer than a trade's worth of the pool
 *   is free or in a trade, the rest locked, moved or untransferable.
 * - `busy`: nothing is wrong, but trades hold so much of the pool that no
 *   trade's worth is free until one of them ends.
 */
export type ListingStop = "blocked" | "busy";

/**
 * What stops every claim on an open listing (ListingStop), or null when a
 * trade's worth of its pool is free and the poster's side allows a claim.
 */
export function listingStop(
  pool: readonly { availability: PoolAvailability }[],
  unitSize: number,
  posterRefused: boolean,
): ListingStop | null {
  const count = (kinds: readonly PoolAvailability["kind"][]) =>
    pool.filter(({ availability }) => kinds.includes(availability.kind)).length;
  if (posterRefused || count(["free", "in_trade"]) < unitSize) {
    return "blocked";
  }
  return count(["free"]) < unitSize ? "busy" : null;
}

/**
 * A listing's public detail. The poster is null once their account is
 * deleted. `items` are every objekt it has offered in posted order, the
 * pool's and the ones that left it, and one trade takes `unitSize` of the
 * pool's for the want rows at their counts. `stop` says what stops every
 * claim on an open listing right now (ListingStop), null when nothing
 * does; a payment row counts as the poster's terms refusing. `rep` is the
 * listing address's rating, null without a visible rating or a poster.
 */
export type TradeListing<TPoster = PublicUser> = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // its place in the feed: when it was posted or last bumped
  bumpedAt: Date;
  note: string | null;
  poster: TPoster | null;
  cosmoUsername: string | null;
  rep: FeedbackRep | null;
  unitSize: number;
  items: ListingItem[];
  wants: ListingFeedWant[];
  state: ListingState;
  stop: ListingStop | null;
};

/**
 * The listing's pool: the objekts it offers that haven't left it, in posted
 * order, whatever else they're doing.
 */
export function poolItems<
  TItem extends Pick<ListingItem, "availability">,
>(listing: { items: readonly TItem[] }) {
  return listing.items.filter((item) => item.availability.kind !== "traded");
}

/**
 * A copy the viewer picked to give, with the collection values the picks
 * are checked against each want row and the collection its card shows.
 */
export type ListingPick = {
  tokenId: number;
  serial: number;
  attributes: IndexedAttributes;
  collection: Objekt.Collection;
};

/**
 * The viewer's side of one want row: how many usable copies of the
 * collections it fits they own and how many it is short once every row
 * draws on them.
 */
export type CandidateRow = {
  owned: number;
  missing: number;
};

/**
 * How many objekts each side of a trade from a listing sends, the poster's
 * first: "2 for 3". A listing's own ratio counts one unit.
 */
export type TradeRatio = { give: number; get: number };

/**
 * Why the poster can't accept an offer on their listing right now, as the
 * error `$acceptOffer` would refuse it with, so the page can reuse its
 * copy. A token refusal carries the data the error does.
 */
export type OfferRefusal =
  | {
      code:
        | Extract<TradeErrorCode, "offer_expired" | "listing_updated">
        | Extract<AuthErrorCode, "cosmo_not_linked">;
    }
  | { code: "offer_unavailable"; tokenId: number | null }
  | { code: "listing_pick_unavailable"; tokenId: number }
  | {
      code: "claim_token_unavailable";
      tokenId: number;
      reason: TokenRefusalReason;
    };

/**
 * Why accepting the offer would be refused right now, or null when it would
 * go through, judged in `$acceptOffer`'s order and with its codes
 * (recheckListingOffer() in claim.server.ts). A refusal over the claimer's
 * side never says whether their link, ban or cap stopped it.
 */
export function offerRefusal(
  offer: {
    expiresAt: Date;
    picks: readonly number[];
    given: readonly number[];
  },
  listing: {
    fromAddress: string;
    pool: ReadonlySet<number>;
    unitSize: number;
    wants: readonly TradeWant[];
    posterRefused: boolean;
  },
  claimer: { address: string; linked: boolean; atCap: boolean },
  tokens: {
    states: ReadonlyMap<number, IndexedToken>;
    poster: TokenFlags;
    claimer: TokenFlags;
  },
  now: Date,
): OfferRefusal | null {
  if (offer.expiresAt.getTime() <= now.getTime()) {
    return { code: "offer_expired" };
  }
  const misfit = listingOfferRefusal(
    {
      picks: offer.picks,
      given: offer.given.map((tokenId): OfferedToken => {
        const state = tokens.states.get(tokenId);
        return state?.kind === "found"
          ? { kind: "found", tokenId, ...state.attributes }
          : { kind: "missing", tokenId };
      }),
    },
    listing,
  );
  if (misfit?.reason === "token_missing") {
    return { code: "offer_unavailable", tokenId: misfit.tokenId };
  }
  if (misfit) return { code: "listing_updated" };
  if (listing.posterRefused) return { code: "cosmo_not_linked" };

  const pick = firstRefusal(
    offer.picks,
    { states: tokens.states, ...tokens.poster },
    listing.fromAddress,
  );
  if (pick?.reason === "live") {
    return { code: "listing_pick_unavailable", tokenId: pick.tokenId };
  }
  if (pick) {
    return {
      code: "claim_token_unavailable",
      tokenId: pick.tokenId,
      reason: pick.reason,
    };
  }

  if (!claimer.linked || claimer.atCap) {
    return { code: "offer_unavailable", tokenId: null };
  }
  const token = firstRefusal(
    offer.given,
    { states: tokens.states, ...tokens.claimer },
    claimer.address,
  );
  return token ? { code: "offer_unavailable", tokenId: token.tokenId } : null;
}

/**
 * The error `$acceptOffer` throws for a refusal, carrying the token it
 * names. A refusal over the claimer's side names their token but never
 * why, as with direct offers.
 */
export function offerRefusalError(refusal: OfferRefusal): ExpectedError {
  switch (refusal.code) {
    case "offer_expired":
    case "listing_updated":
    case "cosmo_not_linked":
      return new ExpectedError(refusal.code);
    case "offer_unavailable":
      return refusal.tokenId === null
        ? new ExpectedError(refusal.code)
        : new ExpectedError(refusal.code, {
            tokenId: refusal.tokenId,
          } satisfies OfferPartnerTokenRefusal);
    case "listing_pick_unavailable":
      return new ExpectedError(refusal.code, {
        tokenId: refusal.tokenId,
      } satisfies ListingPickRefusal);
    case "claim_token_unavailable":
      return new ExpectedError(refusal.code, {
        tokenId: refusal.tokenId,
        reason: refusal.reason,
      } satisfies ClaimTokenRefusal);
  }
}

/**
 * The objekt an offer's refusal names, as the offer shows it: one of the
 * poster's picks for a refusal over the poster's side, or one the claimer
 * gives for `offer_unavailable`. Null when the refusal names none or the
 * indexer doesn't know the objekt's serial, so the copy can't name it.
 */
export function refusedOfferToken(
  refusal: OfferRefusal,
  offer: {
    picks: readonly ListingFeedItem[];
    given: readonly ListingFeedItem[];
  },
): (ListingFeedItem & { serial: number }) | null {
  const find = (items: readonly ListingFeedItem[], tokenId: number | null) => {
    const item = items.find((shown) => shown.tokenId === tokenId);
    return item === undefined || item.serial === null
      ? null
      : { ...item, serial: item.serial };
  };
  switch (refusal.code) {
    case "offer_unavailable":
      return find(offer.given, refusal.tokenId);
    case "listing_pick_unavailable":
    case "claim_token_unavailable":
      return find(offer.picks, refusal.tokenId);
    default:
      return null;
  }
}

/**
 * A pending offer on the poster's listing: who sent it, the poster's
 * objekts it picked from the pool and the claimer's it gives, each with
 * its serial, when it expires, and why it can't be accepted now, null when
 * it can.
 */
export type ListingOfferSummary = {
  tradeId: string;
  claimer: TradeParty;
  picks: ListingFeedItem[];
  given: ListingFeedItem[];
  expiresAt: Date;
  refusal: OfferRefusal | null;
};

/**
 * A trade a claim or an accepted offer started from the poster's listing:
 * the pool objekts it took, how many the claimer gives, and where it stands
 * as My trades says it (needsYou() for an accepted one).
 */
export type ListingTrade = {
  tradeId: string;
  claimer: TradeParty;
  acceptedAt: Date;
  tokenIds: number[];
  givenCount: number;
} & (
  | { status: "accepted"; deadlineAt: Date; toSend: number; needsYou: boolean }
  | { status: "disputed"; deadlineAt: Date; dispute: TradeDispute | null }
  | { status: "completed" | "cancelled" | "timed_out"; endedAt: Date }
);

/**
 * Whether a trade from the listing is live: accepted, or frozen by a
 * dispute.
 */
export function isLiveTrade(
  trade: ListingTrade,
): trade is Extract<
  ListingTrade,
  { status: (typeof liveTradeStatuses)[number] }
> {
  return liveTradeStatuses.some((status) => status === trade.status);
}

/**
 * The listing's live trade that holds the pool objekt, if any.
 */
export function liveHolder(tokenId: number, trades: readonly ListingTrade[]) {
  return trades.find(
    (trade) => isLiveTrade(trade) && trade.tokenIds.includes(tokenId),
  );
}

/**
 * How the viewer's latest offer on a listing ended without a trade, when
 * the poster or the listing ended it: declined, unanswered until it
 * expired, or gone stale when the listing changed or one of its objekts
 * moved.
 */
export type EndedOfferStatus = "declined" | "expired" | "stale";

/**
 * What the listing page shows the signed-in viewer in place of Accept: the
 * poster's offers and trades, the viewer's own live trade (`claimer`, its
 * deadline null while disputed) or pending offer (`offerer`), or for anyone
 * else (`candidate`) the most units they can take, 0 when they can't fill
 * one, with how many matching objekts they own and are short per want row,
 * and what limits them; the poster's side stopping claims is the listing's
 * `stop`.
 */
export type ListingViewer =
  | { role: "anonymous" }
  | { role: "unlinked" }
  | { role: "closed"; tradeId: string | null }
  | { role: "poster"; offers: ListingOfferSummary[]; trades: ListingTrade[] }
  | {
      role: "claimer";
      tradeId: string;
      deadlineAt: Date | null;
      size: TradeRatio;
    }
  | {
      role: "offerer";
      tradeId: string;
      expiresAt: Date;
      picks: ListingFeedItem[];
      given: ListingFeedItem[];
    }
  | {
      role: "candidate";
      units: number;
      rows: CandidateRow[];
      claims: { active: number; cap: number };
      ownAddress: boolean;
      endedOffer: EndedOfferStatus | null;
    };

export type Candidate = Extract<ListingViewer, { role: "candidate" }>;

/**
 * What a candidate sees in place of Accept: the claim cap, which only
 * claims count against (an offer is checked against it once accepted);
 * the poster's side stopping any claim (ListingStop's `blocked`, their own
 * address, or a payment row, which can't be met until sales arrive); the
 * pool all in trades for now (`busy`); or the picker.
 */
export function candidatePanel(
  listing: {
    wants: readonly { kind: StoredWant["kind"] }[];
    stop: ListingStop | null;
  },
  viewer: Pick<Candidate, "claims" | "ownAddress">,
) {
  if (
    !takesOffers(listing.wants) &&
    viewer.claims.active >= viewer.claims.cap
  ) {
    return "cap";
  }
  if (
    listing.stop === "blocked" ||
    viewer.ownAddress ||
    listing.wants.some((want) => want.kind === "payment")
  ) {
    return "blocked";
  }
  return listing.stop === "busy" ? "busy" : "picker";
}

/**
 * Picking a pool objekt, or taking it back: a picked one comes out, and
 * one more goes in while there's room, else it takes the place of the
 * earliest pick, so a tap swaps which objekt the viewer gets.
 */
export function toggleOffered(
  picked: readonly number[],
  tokenId: number,
  count: number,
) {
  if (picked.includes(tokenId)) {
    return picked.filter((shown) => shown !== tokenId);
  }
  return [...picked, tokenId].slice(-count);
}

/**
 * The first of a pending offer's picks that went to someone else, which
 * stops the poster accepting it: another trade holds it now, or one took
 * it out of the pool. Null while every pick is still in the pool and in no
 * trade.
 */
export function takenPick<TPick extends { tokenId: number }>(
  picks: readonly TPick[],
  listing: { items: readonly Pick<ListingItem, "tokenId" | "availability">[] },
) {
  const held = new Set(
    poolItems(listing).flatMap((item) =>
      item.availability.kind === "in_trade" ? [] : [item.tokenId],
    ),
  );
  return picks.find((pick) => !held.has(pick.tokenId)) ?? null;
}

/**
 * Where one of the objekts on the poster's own listing stands, with who
 * has it (PoolAvailability): `in_trade` names the claimer of the live trade
 * from the listing holding it, or null when a trade from elsewhere does;
 * `sent` is one the poster already sent in a live trade from the listing,
 * naming its claimer; `traded` names the claimer of the completed trade it
 * went in; and `gone` is one that left the pool in neither, so it left the
 * poster's account.
 */
export type PoolStanding =
  | { kind: "free" }
  | { kind: "in_trade"; claimer: TradeParty | null }
  | { kind: "sent"; claimer: TradeParty }
  | { kind: "traded"; claimer: TradeParty }
  | { kind: "gone" }
  | { kind: "blocked"; reason: PoolBlockReason };

/**
 * Where a listing objekt stands for its poster (PoolStanding), from the
 * listing's trades, newest first. An objekt that left the pool went in the
 * newest trade holding it that was accepted by then and hadn't ended
 * before, so one that was traded, came back in an edit and then left the
 * poster's account is gone rather than traded again.
 */
export function poolStanding(
  item: Pick<ListingItem, "tokenId" | "availability">,
  trades: readonly ListingTrade[],
): PoolStanding {
  const { availability } = item;
  switch (availability.kind) {
    case "free":
    case "blocked":
      return availability;
    case "in_trade":
      return {
        kind: "in_trade",
        claimer: liveHolder(item.tokenId, trades)?.claimer ?? null,
      };
    case "traded": {
      const left = availability.at.getTime();
      const trade = trades.find(
        (held) =>
          held.tokenIds.includes(item.tokenId) &&
          held.acceptedAt.getTime() <= left &&
          !("endedAt" in held && held.endedAt.getTime() < left),
      );
      switch (trade?.status) {
        case "accepted":
        case "disputed":
          return { kind: "sent", claimer: trade.claimer };
        case "completed":
          return { kind: "traded", claimer: trade.claimer };
        default:
          return { kind: "gone" };
      }
    }
  }
}

export const posterTabs = ["listing", "offers", "trades"] as const;
export type PosterTab = (typeof posterTabs)[number];

/**
 * The listing page's search: the tab the poster has open on their own
 * listing. Everyone else sees the one page whatever it says.
 */
export const listingSearchSchema = z.object({
  tab: z.enum(posterTabs).default("listing").catch("listing"),
});

export const listingSearchDefaults = {
  tab: "listing",
} satisfies z.infer<typeof listingSearchSchema>;

type Poster = Extract<ListingViewer, { role: "poster" }>;

/**
 * The tabs on the poster's own listing, each with what it counts: Listing,
 * then Offers with the pending offers while the listing takes offers or
 * one is still pending, then Trades with the live trades, the ones still
 * waiting on someone. A count of 0 shows nothing.
 */
export function posterTabCounts(
  listing: { takesOffers: boolean },
  viewer: Pick<Poster, "offers" | "trades">,
) {
  const tabs: { tab: PosterTab; count: number }[] = [
    { tab: "listing", count: 0 },
  ];
  if (listing.takesOffers || viewer.offers.length > 0) {
    tabs.push({ tab: "offers", count: viewer.offers.length });
  }
  tabs.push({ tab: "trades", count: viewer.trades.filter(isLiveTrade).length });
  return tabs;
}

/**
 * The tab the poster's listing shows: the one the URL asks for while the
 * listing has it, else Listing, as for Offers once the listing no longer
 * takes offers.
 */
export function shownPosterTab(
  requested: PosterTab,
  tabs: readonly { tab: PosterTab }[],
): PosterTab {
  return tabs.some(({ tab }) => tab === requested) ? requested : "listing";
}

/**
 * How the listing page heads what the listing asks for beside the viewer's
 * panel: "You're looking for" for the poster, and the listing's own
 * "Looking for" for everyone else. The picker heads its rows itself.
 */
export type WantsHeading = "you_look_for" | "looking_for";
