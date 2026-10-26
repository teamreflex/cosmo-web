import { validOnlineTypes } from "@apollo/cosmo/types/common";
import {
  listingOfferRefusal,
  type OfferedToken,
  type TradeWant,
} from "@apollo/trades/allocate";
import {
  type TokenFlags,
  tokenRefusal,
  type TokenRefusalReason,
} from "@apollo/trades/holdings";
import type { ObjektAttributes, RangeFilter } from "@apollo/trades/range";
import * as z from "zod";
import type { PublicUser } from "./auth";
import type { AuthErrorCode } from "./errors/auth";
import type { TradeErrorCode } from "./errors/trades";
import type { FeedbackRep } from "./feedback";
import type { Objekt } from "./objekt-conversion";

export type { TokenRefusalReason } from "@apollo/trades/holdings";

/**
 * A posting or edit refused over one offered token, returned rather than
 * thrown so the composer can name the objekt and serial.
 */
export type TokenRefusal = {
  kind: "token_unavailable";
  tokenId: number;
  reason: TokenRefusalReason;
};

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
    })
    .transform(({ kind, count, ...range }) => ({
      kind,
      count,
      filter: {
        artist: range.artists,
        member: range.members,
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
 * A stored want as allocation and the assignment check read it, or null
 * for a payment row, which no objekt fills.
 */
export function toTradeWant(want: StoredWant): TradeWant | null {
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
    case "payment":
      return null;
  }
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
  nextCursor: string | undefined;
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
  | { kind: "missing"; tokenId: number }
  | {
      kind: "found";
      tokenId: number;
      owner: string;
      transferable: boolean;
      attributes: ObjektAttributes;
    };

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
 *   any claim (posterRefusal()), or fewer than a trade's worth of the pool
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
  attributes: ObjektAttributes;
  collection: Objekt.Collection;
};

/**
 * The viewer's side of one want row: how many usable copies of the
 * collections it fits they own, how many it is short once every row draws
 * on them, and the copies the server's allocation picked for it.
 */
export type CandidateRow = {
  owned: number;
  missing: number;
  picks: ListingPick[];
};

/**
 * The claimer on one of the poster's trades or offers: their Apollo user,
 * null once their account is deleted, the COSMO username behind the
 * address the trade pinned, and that address's rating.
 */
export type ListingCounterparty = {
  user: PublicUser | null;
  cosmoUsername: string | null;
  rep: FeedbackRep | null;
};

/**
 * How many objekts each side of a trade from a listing sends: `from` the
 * poster's picks from the pool, `to` the claimer's, "2 for 2".
 */
export type ListingTradeSize = { from: number; to: number };

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
 * Why accepting the offer would be refused right now, judged in
 * `$acceptOffer`'s order (recheckListingOffer() in claim.server.ts), or null
 * when it would go through: expired; no longer fitting the listing's pool,
 * unit size and rows (listingOfferRefusal), where a claimer token the
 * indexer lost is named; the poster's account; a pick the poster can't
 * give, live elsewhere or otherwise; the claimer's link to the pinned
 * address, ban or claim cap, never saying which; then a claimer token
 * they can't give, named but not why.
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

  const refused = (
    tokenIds: readonly number[],
    address: string,
    flags: TokenFlags,
  ) =>
    tokenIds.flatMap((tokenId) => {
      const reason = tokenRefusal(
        tokens.states.get(tokenId) ?? { kind: "missing", tokenId },
        address,
        flags,
      );
      return reason === null ? [] : [{ tokenId, reason }];
    })[0];
  const pick = refused(offer.picks, listing.fromAddress, tokens.poster);
  if (pick?.reason === "live") {
    return { code: "listing_pick_unavailable", tokenId: pick.tokenId };
  }
  if (pick) return { code: "claim_token_unavailable", ...pick };

  if (!claimer.linked || claimer.atCap) {
    return { code: "offer_unavailable", tokenId: null };
  }
  const token = refused(offer.given, claimer.address, tokens.claimer);
  return token ? { code: "offer_unavailable", tokenId: token.tokenId } : null;
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
  claimer: ListingCounterparty;
  size: ListingTradeSize;
  picks: ListingFeedItem[];
  given: ListingFeedItem[];
  expiresAt: Date;
  refusal: OfferRefusal | null;
};

/**
 * A trade a claim or an accepted offer started from the poster's listing,
 * when it was accepted, and the pool objekts it took:
 * - `accepted`: live, with its deadline, how many of the poster's objekts
 *   are still to send, and whether it waits on the poster (needsYou() in
 *   lifecycle.ts, as My trades says it);
 * - `disputed`: frozen with the time its deadline had left when the
 *   dispute opened, `paused` when staff or the deadline froze it rather
 *   than a party's dispute;
 * - finished, with when it ended.
 */
export type ListingTrade = {
  tradeId: string;
  claimer: ListingCounterparty;
  size: ListingTradeSize;
  acceptedAt: Date;
  tokenIds: number[];
} & (
  | { status: "accepted"; deadlineAt: Date; toSend: number; needsYou: boolean }
  | { status: "disputed"; paused: boolean; deadlineAt: Date; pausedAt: Date }
  | { status: "completed" | "cancelled" | "timed_out"; endedAt: Date }
);

/**
 * How the viewer's latest offer on a listing ended without a trade, when
 * the poster or the listing ended it: declined, unanswered until it
 * expired, or gone stale when the listing changed or one of its objekts
 * moved.
 */
export type EndedOfferStatus = "declined" | "expired" | "stale";

/**
 * What the listing page shows the signed-in viewer in place of Accept.
 * - `poster`: their own open listing, with its pending offers and every
 *   trade it started, newest first.
 * - `claimer`: a viewer with a live trade from the listing, its deadline
 *   null while it's disputed.
 * - `offerer`: a viewer with a pending offer on the listing, with the pool
 *   objekts it picked and the viewer's it gives.
 * - `closed`: the listing ended; the public payload says how. `tradeId` is
 *   the latest trade from it the viewer was a party to.
 * - `candidate`: anyone else on an open listing, with the most units they
 *   can take (`units`, 0 when they can't fill one), their side of each want
 *   row allocated at that many units (one unit's when it's 0, which shows
 *   what's short), each pool objekt as it stands, whether the listing
 *   takes offers rather than claims, the viewer's claim count and whether
 *   their linked address is the one the listing offers from
 *   (`ownAddress`). `endedOffer` says how their latest trade from the
 *   listing ended when it was an offer the poster or the listing ended,
 *   else null. Whether the poster's account stops any claim is the
 *   listing's `blocked`. `updatedAt` is the listing version all of it was
 *   read against, which Accept sends back.
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
      size: ListingTradeSize;
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
      updatedAt: Date;
      units: number;
      takesOffers: boolean;
      pool: { tokenId: number; availability: PoolAvailability }[];
      rows: CandidateRow[];
      claims: { active: number; cap: number };
      ownAddress: boolean;
      endedOffer: EndedOfferStatus | null;
    };

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

/**
 * What the listing page shows before asking the server about the viewer:
 * how a closed listing ended, or for an open one a signed-out or unlinked
 * viewer's prompt. Everyone else may be its poster, a claimer or an
 * offerer, so the server decides (`viewer`); an unlinked poster still
 * sees their own listing.
 */
export type PublicListingPanel =
  | { kind: "closed"; state: ClosedListingState }
  | { kind: "signed_out" }
  | { kind: "unlinked" }
  | { kind: "viewer" };

export function publicListingPanel(
  listing: { state: ListingState; poster: { id: string } | null },
  viewer: { userId: string; linked: boolean } | null,
): PublicListingPanel {
  const { state } = listing;
  if (state.status !== "open") return { kind: "closed", state };
  if (viewer === null) return { kind: "signed_out" };
  return viewer.linked || listing.poster?.id === viewer.userId
    ? { kind: "viewer" }
    : { kind: "unlinked" };
}

/**
 * What a candidate sees in place of Accept: the claim cap, which only
 * claims count against (an offer is checked against it once accepted);
 * the poster's side stopping any claim (ListingStop's `blocked`, their own
 * address, or a payment row, which can't be met until sales arrive); the
 * pool all in trades for now (`busy`); or the picker. The viewer's read
 * of the pool is fresher than the listing's, so it decides whether trades
 * hold too much of it.
 */
export function candidatePanel(
  listing: {
    wants: readonly { kind: StoredWant["kind"] }[];
    stop: ListingStop | null;
    unitSize: number;
  },
  viewer: Pick<Candidate, "claims" | "ownAddress" | "takesOffers" | "pool">,
) {
  if (!viewer.takesOffers && viewer.claims.active >= viewer.claims.cap) {
    return "cap";
  }
  const stop = listingStop(viewer.pool, listing.unitSize, false);
  if (
    listing.stop === "blocked" ||
    stop === "blocked" ||
    viewer.ownAddress ||
    listing.wants.some((want) => want.kind === "payment")
  ) {
    return "blocked";
  }
  return stop === "busy" ? "busy" : "picker";
}

/**
 * Each want row's picks for a claim of `units`: the viewer's `current`
 * picks for the row, in order, up to its count × units, topped up from the
 * server's picks for it that no row already holds. Starting from no picks,
 * that's the server's allocation trimmed: the server allocates at the most
 * units the viewer can fill, and a subset of a full allocation still fills
 * a smaller claim, since every pick fits its row whatever else is picked.
 * `wants` are the rows the picks are for, unscaled.
 */
export function picksForUnits(
  rows: readonly CandidateRow[],
  wants: readonly { count: number }[],
  units: number,
  current: readonly (readonly ListingPick[])[] = [],
): ListingPick[][] {
  const kept = rows.map((row, index) => {
    const count = (wants[index]?.count ?? 0) * units;
    return { row, count, picks: (current[index] ?? []).slice(0, count) };
  });
  const held = new Set(
    kept.flatMap(({ picks }) => picks.map((pick) => pick.tokenId)),
  );
  return kept.map(({ row, count, picks }) => [
    ...picks,
    ...row.picks
      .filter((pick) => !held.has(pick.tokenId))
      .slice(0, count - picks.length),
  ]);
}

/**
 * The pool objekts a claim of `count` takes: the viewer's own picks that
 * are still free, up to `count`, then the first free ones they haven't
 * picked, in pool order. `free` is the pool's free objekts in pool order.
 */
export function offeredForUnits(
  picked: readonly number[],
  free: readonly number[],
  count: number,
) {
  const kept = picked.filter((tokenId) => free.includes(tokenId));
  return [...kept, ...free.filter((tokenId) => !kept.includes(tokenId))].slice(
    0,
    count,
  );
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
  | { kind: "in_trade"; claimer: ListingCounterparty | null }
  | { kind: "sent"; claimer: ListingCounterparty }
  | { kind: "traded"; claimer: ListingCounterparty }
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
  const holding = trades.filter((trade) =>
    trade.tokenIds.includes(item.tokenId),
  );
  const { availability } = item;
  switch (availability.kind) {
    case "free":
    case "blocked":
      return availability;
    case "in_trade":
      return {
        kind: "in_trade",
        claimer:
          holding.find(
            (trade) =>
              trade.status === "accepted" || trade.status === "disputed",
          )?.claimer ?? null,
      };
    case "traded": {
      const left = availability.at.getTime();
      const trade = holding.find(
        (held) =>
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
  tabs.push({
    tab: "trades",
    count: viewer.trades.filter(
      (trade) => trade.status === "accepted" || trade.status === "disputed",
    ).length,
  });
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

/**
 * Which answer the listing page's picker starts its picks from: the terms
 * it was read against, the most units the viewer can take, and per row the
 * copies the viewer owns and the server's picks. A refetch with the same
 * answer keeps the viewer's picks on both sides, including one that only
 * sees another trade take or free a pool objekt, since the picker only
 * keeps the pool picks that are still free; a change in what the viewer
 * owns, another account or new terms start again from the server's
 * picks. A hand-picked copy that became unavailable is left to Accept,
 * which checks every copy again.
 */
export function pickerVersion(
  viewer: Pick<Candidate, "updatedAt" | "units" | "rows">,
) {
  return `${viewer.updatedAt.toISOString()}:${viewer.units}:${viewer.rows
    .map(
      (row) =>
        `${row.owned}/${row.picks.map((pick) => pick.tokenId).join(",")}`,
    )
    .join(";")}`;
}
