import {
  tradeListingWantOptions,
  tradeListingWants,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import type {
  NewTradeListingWant,
  NewTradeOfferItem,
  TradeOfferStatus,
} from "@apollo/database/web/types";
import type { InventoryObjekt } from "@apollo/trades/allocate";
import { firstRefusal } from "@apollo/trades/holdings";
import { offerTransition } from "@apollo/trades/lifecycle";
import type { ListingInput } from "@apollo/trades/listing";
import { isEqual } from "@apollo/util";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type { TradeErrorCode } from "../../universal/errors/trades";
import type { TokenRefusal } from "../../universal/trade-listings";
import { getCosmoAddress } from "../cosmo-accounts.server";
import { db, type DbOrTx, type WebTx } from "../db";
import {
  readTokenStates,
  readWebTokenFlags,
  type ResolvedWant,
  resolveWants,
  type TokenHoldings,
} from "./holdings.server";
import {
  type LockedUser,
  lockParties,
  notifyEach,
  refusePoster,
} from "./trade.server";

/**
 * The signed-in user acting on a listing, with the COSMO address their
 * session was checked against.
 */
export type ListingActor = { userId: string; address: string };

export function posterRow(executor: DbOrTx, userId: string) {
  return executor
    .select({ banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(eq(user.id, userId));
}

/**
 * Locks the poster's row `FOR SHARE`, with the claimers of the listing's
 * pending offers the write ends in the same statement (lockParties), so an
 * account deletion or a ban can't land halfway through the write, and
 * refuses a poster who is gone or banned. Returns the locked rows.
 */
export async function lockPoster(
  tx: WebTx,
  userId: string,
  claimerIds: readonly (string | null)[] = [],
) {
  const users = await lockParties(tx, [userId, ...claimerIds]);
  refusePoster(users.find((row) => row.id === userId));
  return users;
}

/**
 * Locks the poster, and any claimers, as lockPoster does, and returns their
 * COSMO address as stored with the locked rows, refusing a link that moved
 * away from the address the session was checked against.
 */
export async function lockLinkedPoster(
  tx: WebTx,
  actor: ListingActor,
  claimerIds: readonly (string | null)[] = [],
) {
  const users = await lockPoster(tx, actor.userId, claimerIds);
  const link = await getCosmoAddress(tx, actor.userId);
  if (link.kind === "none" || !isEqual(link.address, actor.address)) {
    throw new ExpectedError("cosmo_not_linked" satisfies AuthErrorCode);
  }
  return { address: link.address, users };
}

/**
 * A pending offer on a listing and its claimer, who proposed it.
 */
type ListingOffer = { id: string; toUserId: string | null };

/**
 * The pending offers on the poster's listing in id order: their poster's
 * items keep the listing's id. An edit or a withdrawal reads them before
 * its transaction, to lock their claimers with the poster and then the
 * offers before the listing (docs/auth.md), and an edit again once it holds
 * the listing, after which no new one can be sent.
 */
export function listingOffers(
  executor: DbOrTx,
  posterId: string,
  listingId: string,
): Promise<ListingOffer[]> {
  return executor
    .selectDistinct({ id: tradeOffers.id, toUserId: tradeOffers.toUserId })
    .from(tradeOfferItems)
    .innerJoin(tradeOffers, eq(tradeOffers.id, tradeOfferItems.offerId))
    .where(
      and(
        eq(tradeOfferItems.listingId, listingId),
        eq(tradeOffers.kind, "trade"),
        eq(tradeOffers.status, "pending"),
        eq(tradeOffers.fromUserId, posterId),
      ),
    )
    .orderBy(asc(tradeOffers.id));
}

/**
 * Locks the offers among `offers` that are still pending, in id order,
 * after the users and before the listing (docs/auth.md), and returns them.
 * One accepted or ended since the unlocked read is left to its trade.
 */
export async function lockListingOffers(
  tx: WebTx,
  offers: readonly ListingOffer[],
): Promise<ListingOffer[]> {
  if (offers.length === 0) return [];
  return tx
    .select({ id: tradeOffers.id, toUserId: tradeOffers.toUserId })
    .from(tradeOffers)
    .where(
      and(
        inArray(
          tradeOffers.id,
          offers.map(({ id }) => id),
        ),
        eq(tradeOffers.status, "pending"),
      ),
    )
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
}

/**
 * Ends the locked pending offers on a listing its poster edited or
 * withdrew: an edit turns them stale, since their terms no longer hold, and
 * a withdrawal declines them with the listing named as what closed them.
 * Each claimer hears of it. `users` are the rows lockPoster locked. Returns
 * the ended offers' ids, to publish after commit.
 */
export async function endListingOffers(
  tx: WebTx,
  posterId: string,
  offers: readonly ListingOffer[],
  users: readonly LockedUser[],
  ending: "edit" | "withdraw",
) {
  if (offers.length === 0) return [];
  const { from, to } = offerTransition(
    ending === "edit" ? "go_stale" : "decline",
  );
  const ended = await tx
    .update(tradeOffers)
    .set({ status: to, endedAt: sql`now()`, updatedAt: bumpUpdatedAt })
    .where(
      and(
        inArray(
          tradeOffers.id,
          offers.map(({ id }) => id),
        ),
        eq(tradeOffers.status, from),
      ),
    )
    .returning({ id: tradeOffers.id, toUserId: tradeOffers.toUserId });
  if (ended.length === 0) return [];

  await tx.insert(tradeMessages).values(
    ended.map(({ id }): typeof tradeMessages.$inferInsert => ({
      tradeId: id,
      kind: "event",
      event:
        ending === "edit"
          ? { type: "stale", reason: "edited" }
          : { type: "declined", by: "listing" },
    })),
  );
  await notifyEach(
    tx,
    ended.flatMap((offer) =>
      users.flatMap((recipient) =>
        recipient.id === offer.toUserId
          ? [
              {
                recipient,
                notification: {
                  type: ending === "edit" ? "offer_stale" : "offer_declined",
                  offerId: offer.id,
                  actorId: posterId,
                  tokenId: null,
                },
              },
            ]
          : [],
      ),
    ),
  );
  return ended.map(({ id }) => id);
}

/**
 * The caller's own listing by id. Other people's listings and trade rows
 * read as missing, so a refusal never says what someone else's row is.
 */
export function ownListing(
  executor: DbOrTx,
  userId: string,
  listingId: string,
) {
  return executor
    .select({ status: tradeOffers.status })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.id, listingId),
        eq(tradeOffers.kind, "listing"),
        eq(tradeOffers.fromUserId, userId),
      ),
    );
}

/**
 * The listing a composer read names as the one it edits, once it's the
 * caller's, so the read can exempt its own trades as Save does. Someone
 * else's listing is not found.
 */
export async function editedListing(
  userId: string,
  listingId: string | undefined,
) {
  if (listingId === undefined) return undefined;
  const [listing] = await ownListing(db, userId, listingId);
  if (!listing) throw new ExpectedError("listing_not_found");
  return listingId;
}

export function listingRefusal(
  listing: { status: TradeOfferStatus } | undefined,
): TradeErrorCode | null {
  if (!listing) return "listing_not_found";
  return listing.status === "open" ? null : "listing_closed";
}

export function refuseEdit(listing: { status: TradeOfferStatus } | undefined) {
  const refusal = listingRefusal(listing);
  if (refusal !== null) throw new ExpectedError(refusal);
}

type CheckedTerms = {
  kind: "checked";
  tokenIds: number[];
  holdings: TokenHoldings;
  offered: InventoryObjekt[];
  wants: ResolvedWant[];
  editedListing: string | undefined;
};

/**
 * Checks a listing's terms before any transaction opens: every want must be
 * fillable, then every offered token must be the poster's to offer. Returns
 * the indexer values to copy. An edit passes its listing as `editedListing`,
 * so objekts live in the listing's own trades can stay in its pool.
 */
export async function checkTerms(
  address: string,
  input: ListingInput,
  editedListing?: string,
): Promise<CheckedTerms | TokenRefusal> {
  const tokenIds = input.offered.map(({ tokenId }) => tokenId);
  const wants = await resolveWants(input.wants);
  const holdings = await readTokenStates(address, tokenIds, editedListing);

  return (
    firstRefusal(tokenIds, holdings, address) ?? {
      kind: "checked",
      tokenIds,
      holdings,
      offered: tokenIds.flatMap((tokenId) => {
        const state = holdings.states.get(tokenId);
        return state?.kind === "found"
          ? [{ tokenId, ...state.attributes }]
          : [];
      }),
      wants,
      editedListing,
    }
  );
}

/**
 * Re-reads locks and live trades under the poster's lock, since either can
 * change after the indexer checks.
 */
export async function recheckTokens(
  tx: WebTx,
  address: string,
  terms: CheckedTerms,
) {
  const flags = await readWebTokenFlags(
    tx,
    address,
    terms.tokenIds,
    terms.editedListing,
  );
  return firstRefusal(
    terms.tokenIds,
    { states: terms.holdings.states, ...flags },
    address,
  );
}

const distinct = (values: string[]) => [...new Set(values)];

/**
 * The listing-level arrays: every value any offered objekt has, deduped.
 */
export function listingArrays(offered: InventoryObjekt[]) {
  return {
    slugs: distinct(offered.map((token) => token.slug)),
    artists: distinct(offered.map((token) => token.artist)),
    seasons: distinct(offered.map((token) => token.season)),
    members: distinct(offered.map((token) => token.member)),
    classes: distinct(offered.map((token) => token.class)),
    onOfflines: distinct(offered.map((token) => token.onOffline)),
  };
}

function wantRow(listingId: string, want: ResolvedWant): NewTradeListingWant {
  switch (want.kind) {
    case "exact":
      return { listingId, kind: "exact", count: want.count, ...want.objekt };
    case "range":
      return {
        listingId,
        kind: "range",
        count: want.count,
        artists: want.filter.artist,
        members: want.filter.member,
        seasons: want.filter.season,
        classes: want.filter.class,
        onOfflines: want.filter.on_offline,
      };
    case "choice":
      return { listingId, kind: "choice", count: want.count };
  }
}

/**
 * Inserts the listing's own items, never live and with no `listing_id`,
 * then its wants in one statement, so id order is the posted order, then
 * the collections of its choice rows.
 */
export async function insertTerms(
  tx: WebTx,
  listingId: string,
  terms: CheckedTerms,
) {
  await tx.insert(tradeOfferItems).values(
    terms.offered.map(
      (token) =>
        ({
          offerId: listingId,
          sender: "from",
          kind: "objekt",
          live: false,
          ...token,
        }) satisfies NewTradeOfferItem,
    ),
  );
  const inserted = await tx
    .insert(tradeListingWants)
    .values(terms.wants.map((want) => wantRow(listingId, want)))
    .returning({ id: tradeListingWants.id });
  const ids = inserted.map(({ id }) => id).toSorted((a, b) => a - b);
  const options = terms.wants.flatMap((want, index) => {
    const wantId = ids[index];
    return want.kind === "choice" && wantId !== undefined
      ? want.options.map((objekt) => ({ wantId, ...objekt }))
      : [];
  });
  if (options.length) {
    await tx.insert(tradeListingWantOptions).values(options);
  }
}
