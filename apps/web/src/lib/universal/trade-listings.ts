import { validOnlineTypes } from "@apollo/cosmo/types/common";
import type { TradeWant, WantAllocation } from "@apollo/trades/allocate";
import type { TokenRefusalReason } from "@apollo/trades/holdings";
import type { ObjektAttributes, RangeFilter } from "@apollo/trades/range";
import * as z from "zod";
import type { PublicUser } from "./auth";
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
  | { kind: "saved"; listingId: string }
  | TokenRefusal;

/**
 * A want row as stored, parsed into its kind's shape. The table's CHECK
 * keeps every kind's columns filled, so a parse failure means the schema
 * and this parser have drifted apart.
 */
export const storedWantSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("exact"),
      count: z.int(),
      slug: z.string(),
      artist: z.string(),
      member: z.string(),
      season: z.string(),
      class: z.string(),
      onOffline: z.string(),
    })
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
    case "payment":
      return null;
  }
}

/**
 * An objekt item as stored, with the collection values it copied.
 */
export const storedObjektItemSchema = z
  .object({
    tokenId: z.int(),
    slug: z.string(),
    artist: z.string(),
    member: z.string(),
    season: z.string(),
    class: z.string(),
    onOffline: z.string(),
  })
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
 * A want row in the feed, in posted order. Exact rows carry their
 * collection for the thumbnail and number.
 */
export type ListingFeedWant =
  | (Extract<StoredWant, { kind: "exact" }> & {
      collection: Objekt.Collection | null;
    })
  | Exclude<StoredWant, { kind: "exact" }>;

/**
 * An open listing in the feed.
 */
export type ListingFeedRow = {
  id: string;
  createdAt: Date;
  poster: PublicUser | null;
  cosmoUsername: string | null;
  items: ListingFeedItem[];
  wants: ListingFeedWant[];
};

export type ListingFeedPage = {
  rows: ListingFeedRow[];
  nextCursor: string | undefined;
};

/**
 * Where a listing stands, parsed from the listing row and the trade it led
 * to. A claim shows only its deadline, so the public payload never says who
 * claimed it; a filled listing names the COSMO account it was traded to.
 * Listings never expire, so there is no expired state.
 */
export const listingStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("open") }),
  z.object({ status: z.literal("claimed"), deadlineAt: z.date() }),
  z.object({
    status: z.literal("filled"),
    endedAt: z.date(),
    counterparty: z.string().nullable(),
  }),
  z.object({
    status: z.enum(["withdrawn", "broken", "removed", "abandoned"]),
    endedAt: z.date(),
  }),
]);

export type ListingState = z.output<typeof listingStateSchema>;
export type ClosedListingState = Exclude<
  ListingState,
  { status: "open" | "claimed" }
>;

/**
 * A listing's public detail. The poster is null once their account is
 * deleted. `blocked` says an open listing's poster side stops every claim
 * right now: an offered objekt locked, moved or in a trade, a payment row,
 * or the poster banned or linked elsewhere.
 */
export type TradeListing<TPoster = PublicUser> = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  note: string | null;
  poster: TPoster | null;
  cosmoUsername: string | null;
  items: ListingFeedItem[];
  wants: ListingFeedWant[];
  state: ListingState;
  blocked: boolean;
};

/**
 * A copy the viewer could give, with the collection values the picker
 * matches against each want row.
 */
export type ListingCandidate = {
  tokenId: number;
  serial: number;
  attributes: ObjektAttributes;
};

/**
 * What the listing page shows the signed-in viewer in place of Accept.
 * - `poster`: their own listing, with who claimed it and until when.
 * - `claimer` / `onlooker`: a claimed listing, theirs or someone else's.
 * - `closed`: the listing ended; the public payload says how.
 * - `candidate`: an open listing, with the viewer's usable copies in the
 *   order allocation spends them, the allocation, how many matching copies
 *   each row could draw on, the viewer's claim count and whether the
 *   poster's side stops any claim. `updatedAt` is the listing version all
 *   of it was read against, which Accept sends back.
 */
export type ListingViewer =
  | { role: "anonymous" }
  | { role: "unlinked" }
  | { role: "closed" }
  | {
      role: "poster";
      claim: { username: string | null; deadlineAt: Date } | null;
    }
  | { role: "claimer"; deadlineAt: Date }
  | { role: "onlooker"; deadlineAt: Date }
  | {
      role: "candidate";
      updatedAt: Date;
      collections: Objekt.Collection[];
      inventory: ListingCandidate[];
      allocation: WantAllocation[];
      rowOwned: number[];
      claims: { active: number; cap: number };
      blocked: boolean;
    };

/**
 * What the listing page shows before asking the server about the viewer.
 * Nobody can accept a claimed listing, so a signed-out viewer sees its
 * countdown; a signed-in one may be its poster or claimer, so the server
 * decides (`viewer`), as it does for a linked viewer of someone else's open
 * listing.
 */
export type PublicListingPanel =
  | { kind: "closed"; state: ClosedListingState }
  | { kind: "onlooker"; deadlineAt: Date }
  | { kind: "signed_out" }
  | { kind: "poster_open" }
  | { kind: "unlinked" }
  | { kind: "viewer" };

export function publicListingPanel(
  listing: { state: ListingState; poster: { id: string } | null },
  viewer: { userId: string; linked: boolean } | null,
): PublicListingPanel {
  const { state } = listing;
  if (state.status !== "open" && state.status !== "claimed") {
    return { kind: "closed", state };
  }
  if (state.status === "claimed") {
    return viewer === null
      ? { kind: "onlooker", deadlineAt: state.deadlineAt }
      : { kind: "viewer" };
  }
  if (viewer === null) return { kind: "signed_out" };
  if (listing.poster?.id === viewer.userId) return { kind: "poster_open" };
  return viewer.linked ? { kind: "viewer" } : { kind: "unlinked" };
}

/**
 * What a candidate sees in place of Accept: the claim cap, the poster's
 * side stopping any claim (a payment row can't be met until sales arrive),
 * or the picker.
 */
export function candidatePanel(
  wants: readonly { kind: StoredWant["kind"] }[],
  viewer: Pick<
    Extract<ListingViewer, { role: "candidate" }>,
    "claims" | "blocked"
  >,
) {
  if (viewer.claims.active >= viewer.claims.cap) return "cap";
  if (viewer.blocked || wants.some((want) => want.kind === "payment")) {
    return "blocked";
  }
  return "picker";
}

/**
 * How the listing page heads what the listing asks for beside the viewer's
 * panel: "You give" for the claimer, who is giving it, and the listing's
 * own "Looking for" for everyone else. The picker heads its rows itself.
 */
export type WantsHeading = "you_give" | "looking_for";

/**
 * Which answer the listing page's picker starts its picks from: the terms
 * it was read against and the copies the viewer could give. A refetch with
 * the same copies keeps the viewer's swaps; a copy that became unavailable,
 * another account's copies or new terms start again from the server's
 * allocation.
 */
export function pickerVersion(
  viewer: Pick<
    Extract<ListingViewer, { role: "candidate" }>,
    "updatedAt" | "inventory"
  >,
) {
  return `${viewer.updatedAt.toISOString()}:${viewer.inventory
    .map((candidate) => candidate.tokenId)
    .join(",")}`;
}
