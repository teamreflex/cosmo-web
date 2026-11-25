import {
  tradeListingWantOptions,
  tradeListingWantRanges,
  tradeListingWants,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import {
  bumpUpdatedAt,
  listingPoolState,
  listingTakenUnits,
} from "@apollo/database/web/sql";
import type {
  NewTradeListingWant,
  NewTradeListingWantRange,
  NewTradeOfferItem,
  TradeOffer,
  TradeOfferStatus,
} from "@apollo/database/web/types";
import type { InventoryObjekt } from "@apollo/trades/allocate";
import { firstRefusal } from "@apollo/trades/holdings";
import {
  editUnitsRefusal,
  type ListingUnits,
  listingUnits,
  offerTransition,
} from "@apollo/trades/lifecycle";
import type { ListingInput } from "@apollo/trades/listing";
import {
  type ListingPayment,
  type PaymentTerms,
  toNumeric,
} from "@apollo/trades/payment";
import { isEqual } from "@apollo/util";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type { TradeErrorCode } from "../../universal/errors/trades";
import type { TokenRefusal } from "../../universal/trade-listings";
import { getCosmoAddress } from "../cosmo-accounts.server";
import { db, type DbOrTx, type WebTx } from "../db";
import { assertSupportedCurrency } from "../objekts/fx.server";
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
 * offers before the listing (docs/locking.md), and an edit again once it holds
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
 * after the users and before the listing (docs/locking.md), and returns them.
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
 * The caller's own listing by id, with its units' columns. Other people's listings and trade rows read as missing, so a refusal never says what someone else's row is.
 */
export function ownListing(
  executor: DbOrTx,
  userId: string,
  listingId: string,
) {
  return executor
    .select({
      id: tradeOffers.id,
      status: tradeOffers.status,
      unitSize: tradeOffers.unitSize,
      maxUnits: tradeOffers.maxUnits,
    })
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

export function refuseEdit<TListing extends { status: TradeOfferStatus }>(
  listing: TListing | undefined,
): asserts listing is TListing {
  const refusal = listingRefusal(listing);
  if (refusal !== null) throw new ExpectedError(refusal);
}

type CheckedTerms = {
  kind: "checked";
  tokenIds: number[];
  holdings: TokenHoldings;
  offered: InventoryObjekt[];
  options: { wants: ResolvedWant[]; payment: ListingPayment | null }[];
  payment: PaymentTerms | null;
  editedListing: string | undefined;
};

/**
 * Checks a listing's terms before any transaction opens: a payment's
 * currency must have a rate, every want of every option must be fillable,
 * then every offered token must be the poster's to offer. Returns the
 * indexer values to copy. An edit passes its listing as `editedListing`,
 * so objekts live in the listing's own trades can stay in its pool.
 */
export async function checkTerms(
  address: string,
  input: ListingInput,
  editedListing?: string,
): Promise<CheckedTerms | TokenRefusal> {
  if (input.payment !== null) {
    await assertSupportedCurrency(input.payment.currency);
  }
  const tokenIds = input.offered.map(({ tokenId }) => tokenId);
  // one indexer read for every option's rows, split back in posted order
  const resolved = await resolveWants(
    input.options.flatMap((option) => option.wants),
  );
  let start = 0;
  const options = input.options.map((option) => {
    const wants = resolved.slice(start, start + option.wants.length);
    start += option.wants.length;
    return { wants, payment: option.payment };
  });
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
      options,
      payment: input.payment,
      editedListing,
    }
  );
}

/**
 * The listing row's unit columns (ListingUnits): a pool listing's unit
 * size, or a buy listing's most units.
 */
export function unitColumns(
  units: ListingUnits,
): Pick<typeof tradeOffers.$inferInsert, "unitSize" | "maxUnits"> {
  return units.kind === "pool"
    ? { unitSize: units.unitSize, maxUnits: null }
    : { unitSize: null, maxUnits: units.maxUnits };
}

/**
 * Refuses an edit of a locked listing whose units its trades rule out (editUnitsRefusal()): a change of kind while it has a live or completed trade, or a buy listing's most units below what its trades hold. A pool listing staying a pool listing can't be refused, so its trades go unread. They are read in a statement of their own after the lock, which sees every trade committed while the edit waited for it, where a subquery in the locking statement would read the snapshot taken before.
 */
export async function refuseUnitsChange(
  tx: WebTx,
  listing: Pick<TradeOffer, "id" | "unitSize" | "maxUnits">,
  units: ListingUnits,
) {
  const held = listingUnits(listing);
  if (held.kind === "pool" && units.kind === "pool") return;
  const [trades] = await tx
    .select({
      live: listingPoolState.live,
      completed: listingPoolState.completed,
      taken: listingTakenUnits(tradeOffers),
      completedUnits: listingPoolState.completedUnits,
    })
    .from(tradeOffers)
    .where(eq(tradeOffers.id, listing.id));
  if (trades === undefined) return;
  switch (editUnitsRefusal(units, { ...trades, units: held })) {
    case "kind_fixed":
      throw new ExpectedError("listing_kind_fixed");
    case "units_taken":
      throw new ExpectedError("listing_units_taken");
    case null:
      return;
  }
}

/**
 * The listing row's payment columns: who sends the payment, the methods it
 * may arrive by and its offer mode. All empty without a payment.
 */
export function paymentColumns(
  payment: PaymentTerms | null,
): Pick<
  typeof tradeOffers.$inferInsert,
  "paymentSide" | "paymentMethods" | "offers"
> {
  return payment === null
    ? { paymentSide: null, paymentMethods: [], offers: null }
    : {
        paymentSide: payment.side,
        paymentMethods: payment.methods,
        offers: payment.mode,
      };
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
    // every member the offered collections name, as the feed's member filter matches items
    members: distinct(offered.flatMap((token) => token.members)),
    classes: distinct(offered.map((token) => token.class)),
    onOfflines: distinct(offered.map((token) => token.onOffline)),
  };
}

function wantRow(
  listingId: string,
  option: number,
  want: ResolvedWant,
): NewTradeListingWant {
  switch (want.kind) {
    case "exact":
      return {
        listingId,
        option,
        kind: "exact",
        count: want.count,
        ...want.objekt,
      };
    case "range":
    case "choice":
      return { listingId, option, kind: want.kind, count: want.count };
  }
}

/**
 * The listing's payment rows: one in each option the claimer's payment
 * prices, or the poster's one in option 0, which prices every option.
 */
function paymentRows(
  listingId: string,
  terms: CheckedTerms,
): NewTradeListingWant[] {
  const priced = terms.options.flatMap(({ payment }, option) =>
    payment === null ? [] : [{ option, payment }],
  );
  return (terms.payment?.side === "from" ? priced.slice(0, 1) : priced).map(
    ({ option, payment }) => ({
      listingId,
      option,
      kind: "payment",
      amount: payment.amount === null ? null : toNumeric(payment.amount),
      currency: payment.currency,
    }),
  );
}

/**
 * Inserts the listing's own items, never live and with no `listing_id` (none on a buy listing), then every option's objekt wants in one statement, in option order, so id order is the posted order, then its payment rows, then the collections of its choice rows and the ranges of its range rows.
 */
export async function insertTerms(
  tx: WebTx,
  listingId: string,
  terms: CheckedTerms,
) {
  // a buy listing offers no objekts
  if (terms.offered.length > 0) {
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
  }
  const wants = terms.options.flatMap((option, index) =>
    option.wants.map((want) => ({ option: index, want })),
  );
  // a sale asks for no objekts
  const inserted =
    wants.length === 0
      ? []
      : await tx
          .insert(tradeListingWants)
          .values(
            wants.map(({ option, want }) => wantRow(listingId, option, want)),
          )
          .returning({ id: tradeListingWants.id });
  const ids = inserted.map(({ id }) => id).toSorted((a, b) => a - b);
  const payments = paymentRows(listingId, terms);
  if (payments.length > 0) {
    await tx.insert(tradeListingWants).values(payments);
  }
  const options = wants.flatMap(({ want }, index) => {
    const wantId = ids[index];
    return want.kind === "choice" && wantId !== undefined
      ? want.options.map((objekt) => ({ wantId, ...objekt }))
      : [];
  });
  const ranges = wants.flatMap(({ want }, index) => {
    const wantId = ids[index];
    return want.kind === "range" && wantId !== undefined
      ? want.ranges.map(
          (filter, position) =>
            ({
              wantId,
              position,
              artists: filter.artist,
              members: filter.member,
              collectionNos: filter.collectionNo,
              seasons: filter.season,
              classes: filter.class,
              onOfflines: filter.on_offline,
            }) satisfies NewTradeListingWantRange,
        )
      : [];
  });
  if (options.length) {
    await tx.insert(tradeListingWantOptions).values(options);
  }
  if (ranges.length) {
    await tx.insert(tradeListingWantRanges).values(ranges);
  }
}
