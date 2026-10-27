import { toPublicUser } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { feedbackRepColumns } from "@/lib/server/feedback.server";
import {
  authenticatedMiddleware,
  authMiddleware,
  cosmoMiddleware,
} from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import {
  insertTrade,
  lockAndRecheck,
  preflightClaim,
} from "@/lib/server/trades/claim.server";
import {
  listingStateExtras,
  readListingViewer,
  toListingState,
} from "@/lib/server/trades/detail.server";
import {
  hydrateListings,
  poolFlags,
  poolItemExtras,
  storedWants,
} from "@/lib/server/trades/feed.server";
import {
  countRangeMatches,
  liveItem,
  readTokenStates,
} from "@/lib/server/trades/holdings.server";
import {
  checkTerms,
  editedListing,
  endListingOffers,
  insertTerms,
  listingArrays,
  listingOffers,
  listingRefusal,
  lockLinkedPoster,
  lockListingOffers,
  lockPoster,
  ownListing,
  posterRow,
  recheckTokens,
  refuseEdit,
} from "@/lib/server/trades/listings.server";
import {
  posterBlocked,
  posterLinkColumns,
} from "@/lib/server/trades/poster.server";
import { refusePoster } from "@/lib/server/trades/trade.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { toFeedbackRep } from "@/lib/universal/feedback";
import {
  type ListingItem,
  listingStop,
  type ListingViewer,
  type ListingWriteResult,
  poolAvailability,
  poolItems,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import {
  lockedObjekts,
  tradeListingWants,
  tradeOfferItems,
  tradeOffers,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import { MAX_WANT_ROWS } from "@apollo/trades/caps";
import { tokenRefusals } from "@apollo/trades/holdings";
import { listingTransition, listingUnitSize } from "@apollo/trades/lifecycle";
import {
  claimListingInputSchema,
  editListingInputSchema,
  listingIdInputSchema,
  listingInputSchema,
  offeredTokensInputSchema,
  tradeTokenStatesInputSchema,
} from "@apollo/trades/listing";
import { rangeFilterSchema } from "@apollo/trades/range";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import * as z from "zod";

/**
 * Post a trade listing from the caller's linked address. A token the poster
 * can't offer comes back as a refusal naming it, so the composer can show
 * its serial; everything else that stops the post throws an ExpectedError.
 */
export const $postListing = createServerFn({ method: "POST" })
  .validator(listingInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const actor = {
      userId: context.session.user.id,
      address: context.cosmo.address,
    };
    await consumeRateLimit({
      key: `listing-post:${actor.userId}`,
      limit: 10,
      window: "10 minutes",
    });

    const terms = await checkTerms(actor.address, data);
    if (terms.kind === "token_unavailable") return terms;

    return db.transaction(async (tx): Promise<ListingWriteResult> => {
      const { address } = await lockLinkedPoster(tx, actor);
      const refusal = await recheckTokens(tx, address, terms);
      if (refusal) return refusal;

      const [listing] = await tx
        .insert(tradeOffers)
        .values({
          kind: "listing",
          status: "open",
          fromUserId: actor.userId,
          fromAddress: address,
          unitSize: data.unitSize,
          note: data.note,
          ...listingArrays(terms.offered),
        })
        .returning({ id: tradeOffers.id });
      if (!listing) throw new Error("Listing insert returned no row");

      await insertTerms(tx, listing.id, terms);
      return { kind: "saved", listingId: listing.id };
    });
  });

/**
 * Replace the terms of the caller's open listing: the arrays, the pinned
 * address, the unit size, the note, its items and its wants. Refusals
 * follow a fixed order: the poster, then the listing (missing or not
 * theirs, closed), then the wants, then the offered tokens. Its live trades
 * keep their own copies of the objekts they took, whatever the edit drops,
 * but its pending offers were made on the old terms, so they turn stale and
 * their claimers hear of it. They are locked before the listing
 * (docs/auth.md), so one sent after they were read refuses the edit with
 * `listing_updated`. `created_at` never changes, so the listing keeps its
 * place in the feed.
 */
export const $editListing = createServerFn({ method: "POST" })
  .validator(editListingInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const actor = {
      userId: context.session.user.id,
      address: context.cosmo.address,
    };
    await consumeRateLimit({
      key: `listing-edit:${actor.userId}`,
      limit: 20,
      window: "10 minutes",
    });

    refusePoster((await posterRow(db, actor.userId))[0]);
    refuseEdit((await ownListing(db, actor.userId, data.listingId))[0]);
    const terms = await checkTerms(actor.address, data, data.listingId);
    if (terms.kind === "token_unavailable") return terms;
    const seen = await listingOffers(db, actor.userId, data.listingId);

    const { result, ended } = await db.transaction(
      async (tx): Promise<{ result: ListingWriteResult; ended: string[] }> => {
        // the poster and the claimers, then the offers, then the listing
        const { address, users } = await lockLinkedPoster(
          tx,
          actor,
          seen.map((offer) => offer.toUserId),
        );
        const offers = await lockListingOffers(tx, seen);
        const [listing] = await ownListing(
          tx,
          actor.userId,
          data.listingId,
        ).for("update");
        refuseEdit(listing);
        const locked = new Set(offers.map((offer) => offer.id));
        const now = await listingOffers(tx, actor.userId, data.listingId);
        if (now.some((offer) => !locked.has(offer.id))) {
          throw new ExpectedError("listing_updated");
        }
        const refusal = await recheckTokens(tx, address, terms);
        if (refusal) return { result: refusal, ended: [] };

        await tx
          .update(tradeOffers)
          .set({
            ...listingArrays(terms.offered),
            fromAddress: address,
            unitSize: data.unitSize,
            note: data.note,
            updatedAt: bumpUpdatedAt,
          })
          .where(eq(tradeOffers.id, data.listingId));
        await tx
          .delete(tradeOfferItems)
          .where(
            and(
              eq(tradeOfferItems.offerId, data.listingId),
              isNull(tradeOfferItems.leftAt),
            ),
          );
        await tx
          .delete(tradeListingWants)
          .where(eq(tradeListingWants.listingId, data.listingId));
        await insertTerms(tx, data.listingId, terms);
        return {
          result: { kind: "saved", listingId: data.listingId },
          ended: await endListingOffers(
            tx,
            actor.userId,
            offers,
            users,
            "edit",
          ),
        };
      },
    );
    await publishTradeUpdates(ended);
    return result;
  });

/**
 * Close the caller's open listing; its live trades carry on, and its
 * pending offers are declined with the listing named as what closed them,
 * which their claimers hear. The offers are locked before the listing
 * (docs/auth.md); one sent after they were read is left for trade-timers,
 * which declines the offers on closed listings. Anyone else's listing, and
 * any trade row, is not found whatever its status; the poster's own closed
 * listing says so.
 */
export const $withdrawListing = createServerFn({ method: "POST" })
  .validator(listingIdInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const { from, to } = listingTransition("withdraw");
    const seen = await listingOffers(db, userId, data.listingId);
    const ended = await db.transaction(async (tx) => {
      // the poster and the claimers, then the offers, then the listing
      const users = await lockPoster(
        tx,
        userId,
        seen.map((offer) => offer.toUserId),
      );
      const offers = await lockListingOffers(tx, seen);
      const [withdrawn] = await tx
        .update(tradeOffers)
        .set({ status: to, endedAt: sql`now()`, updatedAt: bumpUpdatedAt })
        .where(
          and(
            eq(tradeOffers.id, data.listingId),
            eq(tradeOffers.kind, "listing"),
            eq(tradeOffers.fromUserId, userId),
            inArray(tradeOffers.status, [...from]),
          ),
        )
        .returning({ id: tradeOffers.id });
      if (withdrawn) {
        return endListingOffers(tx, userId, offers, users, "withdraw");
      }

      const [listing] = await ownListing(tx, userId, data.listingId);
      throw new ExpectedError(listingRefusal(listing) ?? "listing_closed");
    });
    await publishTradeUpdates(ended);
  });

/**
 * Accept some units of a listing: the poster's objekts the claimer picked
 * from the pool and the tokens they give, one list per want row, as of the
 * listing's `updated_at` they saw. Each claim is its own trade, and claims
 * on one listing run side by side as long as they pick different objekts;
 * a claimer holds one live trade per listing. A listing with a range row
 * takes offers instead (takesOffers): the same request, checked the same
 * way except for the claim cap, sends the poster a pending offer that
 * reserves nothing and that they accept or decline, and a claimer holds one
 * live trade or pending offer per listing. Every refusal is an
 * ExpectedError and writes nothing. The order they're checked in is fixed,
 * so the same request always gets the same answer. Returns the trade's id
 * and whether it is a pending offer.
 */
export const $claimListing = createServerFn({ method: "POST" })
  .validator(claimListingInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const actor = {
      userId: context.session.user.id,
      address: context.cosmo.address,
    };
    await consumeRateLimit({
      key: `listing-claim:${actor.userId}`,
      limit: 10,
      window: "10 minutes",
    });

    const preflight = await preflightClaim(actor, data);
    const claim = await db.transaction(async (tx) =>
      insertTrade(
        tx,
        actor,
        preflight,
        await lockAndRecheck(tx, actor, data, preflight),
      ),
    );
    await publishTradeUpdates([claim.tradeId]);
    return claim;
  });

/**
 * How many collections each range row matches, in the rows' order, for the
 * composer's preview and the listing page, in one indexer statement.
 */
export const $fetchRangeMatchCounts = createServerFn({ method: "GET" })
  .validator(z.array(rangeFilterSchema).min(1).max(MAX_WANT_ROWS))
  .handler(({ data }) => countRangeMatches(data));

/**
 * The caller's locked tokens and the tokens in their live trades, which the
 * composer greys out. Tokens in open listings aren't live, so they stay
 * pickable, and so do those live in the trades of the listing being edited,
 * which Save keeps.
 */
export const $fetchTradeTokenStates = createServerFn({ method: "GET" })
  .validator(tradeTokenStatesInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const { address } = context.cosmo;
    const edited = await editedListing(context.session.user.id, data.listingId);
    // the caller's locks and live trade tokens, in one statement
    const rows = await db
      .select({
        tokenId: sql<number | null>`${lockedObjekts.tokenId}`.as("token_id"),
        flag: sql<"locked" | "live">`'locked'`.as("flag"),
      })
      .from(lockedObjekts)
      .where(
        and(eq(lockedObjekts.address, address), eq(lockedObjekts.locked, true)),
      )
      .union(
        db
          .select({
            tokenId: sql<number | null>`${tradeOfferItems.tokenId}`.as(
              "token_id",
            ),
            flag: sql<"locked" | "live">`'live'`.as("flag"),
          })
          .from(tradeOfferItems)
          .innerJoin(tradeOffers, eq(tradeOfferItems.offerId, tradeOffers.id))
          .where(
            and(
              liveItem(edited),
              or(
                eq(tradeOffers.fromAddress, address),
                eq(tradeOffers.toAddress, address),
              ),
            ),
          ),
      )
      .orderBy(sql`token_id`);

    return {
      locked: rows.flatMap((row) =>
        row.flag === "locked" && row.tokenId !== null ? [row.tokenId] : [],
      ),
      live: rows.flatMap((row) =>
        row.flag === "live" && row.tokenId !== null ? [row.tokenId] : [],
      ),
    };
  });

/**
 * Which of the objekts the caller offers they couldn't offer right now, and
 * why, so the composer and their own listing flag them before Post or Save
 * refuses them. An edit names its listing, which exempts the listing's own
 * trades as Save does.
 */
export const $fetchOfferedTokenRefusals = createServerFn({ method: "GET" })
  .validator(offeredTokensInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) =>
    tokenRefusals(
      data.tokenIds,
      await readTokenStates(
        context.cosmo.address,
        data.tokenIds,
        await editedListing(context.session.user.id, data.listingId),
      ),
      context.cosmo.address,
    ),
  );

/**
 * A listing's public detail and the session's side of it, or null when the
 * id isn't a listing. One statement reads the listing, its pool's flags and
 * a filled one's state, one indexer statement its objekts, then the
 * viewer's own reads, whose candidate takes its free count from the public
 * items. The public half never names who holds a claim: no claimer id,
 * address or tokens, only that an objekt is in a trade.
 */
export const $fetchTradeListing = createServerFn({ method: "GET" })
  .validator(listingIdInputSchema)
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }): Promise<{ listing: TradeListing; viewer: ListingViewer } | null> => {
      const row = await db.query.tradeOffers.findFirst({
        where: { id: data.listingId, kind: "listing" },
        columns: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          endedAt: true,
          note: true,
          fromUserId: true,
          fromAddress: true,
          unitSize: true,
        },
        extras: listingStateExtras,
        with: {
          items: { orderBy: { id: "asc" }, extras: poolItemExtras },
          wants: storedWants,
          fromUser: { with: { cosmoAccount: posterLinkColumns } },
          fromCosmo: { columns: { username: true } },
          fromStats: { columns: feedbackRepColumns },
        },
      });
      if (!row) return null;
      const unitSize = listingUnitSize(row);

      const {
        listings: [listing],
        states,
      } = await hydrateListings([row]);
      if (!listing) return null;
      const state = toListingState(row);
      const flags = poolFlags(row.items);
      // an objekt that left and was offered again shows once, as its latest row
      const latest = new Map(
        listing.items.map((item, index) => [item.tokenId, index]),
      );
      const items = listing.items.flatMap((item, index): ListingItem[] =>
        latest.get(item.tokenId) === index
          ? [
              {
                ...item,
                availability: poolAvailability(
                  {
                    tokenId: item.tokenId,
                    leftAt: row.items[index]?.leftAt ?? null,
                  },
                  states.get(item.tokenId),
                  listing.fromAddress,
                  flags,
                ),
              },
            ]
          : [],
      );
      const posterRefused = posterBlocked(
        listing.wants,
        listing.fromUser,
        listing.fromAddress,
      );
      return {
        listing: {
          id: listing.id,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          note: listing.note,
          poster: listing.fromUser && toPublicUser(listing.fromUser),
          cosmoUsername: listing.fromCosmo?.username ?? null,
          rep: listing.fromUser && toFeedbackRep(listing.fromStats),
          unitSize,
          items,
          wants: listing.wants,
          state,
          // only an open listing can be claimed, so only an open one is judged
          stop:
            state.status === "open"
              ? listingStop(items, unitSize, posterRefused)
              : null,
        },
        viewer: await readListingViewer(
          {
            id: row.id,
            status: row.status,
            fromUserId: row.fromUserId,
            fromAddress: row.fromAddress,
            unitSize,
            wants: listing.wants,
            pool: poolItems({ items }).map((item) => item.tokenId),
            free: items.filter((item) => item.availability.kind === "free")
              .length,
            posterRefused,
          },
          context.session?.user.id,
        ),
      };
    },
  );
