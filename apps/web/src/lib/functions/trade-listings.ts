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
  claimStanding,
  offerSides,
  readCandidateSide,
  readEndedOffer,
  readListingState,
  readListingTrades,
  readPosterSide,
  tradeSize,
} from "@/lib/server/trades/detail.server";
import { hydrateListings, storedWants } from "@/lib/server/trades/feed.server";
import {
  countRangeMatches,
  readTokenStates,
  readWebTokenFlags,
  tokenRefusals,
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
  posterLinkColumns,
  posterRefusal,
  toPosterAccount,
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
  storedObjektItemSchema,
  storedWantSchema,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import {
  lockedObjekts,
  tradeListingWants,
  tradeOfferItems,
  tradeOffers,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import { openTradeStatuses } from "@apollo/database/web/types";
import { claimCap } from "@apollo/trades/caps";
import { listingTransition, takesOffers } from "@apollo/trades/lifecycle";
import {
  claimListingInputSchema,
  editListingInputSchema,
  listingIdInputSchema,
  listingInputSchema,
  offeredTokensInputSchema,
  tradeTokenStatesInputSchema,
} from "@apollo/trades/listing";
import { rangeFilterSchema } from "@apollo/trades/range";
import { isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";

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
 * How many collections a range row matches, for the composer's preview.
 */
export const $fetchRangeMatchCount = createServerFn({ method: "GET" })
  .validator(rangeFilterSchema)
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
              eq(tradeOfferItems.live, true),
              or(
                eq(tradeOffers.fromAddress, address),
                eq(tradeOffers.toAddress, address),
              ),
              edited === undefined
                ? undefined
                : or(
                    isNull(tradeOfferItems.listingId),
                    ne(tradeOfferItems.listingId, edited),
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
 * A listing's public detail, or null when the id isn't a listing: every
 * objekt it has offered with where it stands, the pool's and the ones that
 * left it. It never names who holds a claim: no claimer id, address or
 * tokens, only that an objekt is in a trade.
 */
export const $fetchTradeListing = createServerFn({ method: "GET" })
  .validator(listingIdInputSchema)
  .handler(async ({ data }): Promise<TradeListing | null> => {
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
      with: {
        items: { orderBy: { id: "asc" } },
        wants: storedWants,
        fromUser: { with: { cosmoAccount: posterLinkColumns } },
        fromCosmo: { columns: { username: true } },
        fromStats: { columns: feedbackRepColumns },
      },
    });
    if (!row) return null;
    // trade_offers_unit_size_chk: every listing has a unit size
    if (row.unitSize === null) throw new Error(`listing ${row.id} has no unit`);

    const {
      listings: [listing],
      states,
    } = await hydrateListings([row]);
    if (!listing) return null;
    const state = await readListingState(row);
    const flags = await readWebTokenFlags(
      db,
      row.fromAddress,
      row.items.flatMap((item) => item.tokenId ?? []),
    );
    const items = listing.items.map((item, index): ListingItem => ({
      ...item,
      availability: poolAvailability(
        { tokenId: item.tokenId, leftAt: row.items[index]?.leftAt ?? null },
        states.get(item.tokenId),
        listing.fromAddress,
        flags,
      ),
    }));
    return {
      id: listing.id,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      note: listing.note,
      poster: listing.fromUser && toPublicUser(listing.fromUser),
      cosmoUsername: listing.fromCosmo?.username ?? null,
      rep: listing.fromUser && toFeedbackRep(listing.fromStats),
      unitSize: row.unitSize,
      items,
      wants: listing.wants,
      state,
      // only an open listing can be claimed, so only an open one is judged
      stop:
        state.status === "open"
          ? listingStop(
              items,
              row.unitSize,
              posterRefusal(
                {
                  wantKinds: listing.wants.map((want) => want.kind),
                  poster: listing.fromUser && toPosterAccount(listing.fromUser),
                },
                listing.fromAddress,
              ) !== null,
            )
          : null,
    };
  });

/**
 * The signed-in viewer's side of a listing, shown in place of Accept, or
 * null when the id isn't a listing. Always the session's own view; signed
 * out, it's anonymous. Only the listing's parties learn its trades' ids.
 * The poster of an open listing gets its offers and trades; a viewer with
 * a live trade or a pending offer from it gets that; anyone else is a
 * candidate. Only an open listing's candidates are read: closed listings
 * and the poster's own never touch the viewer's holdings.
 */
export const $fetchTradeListingViewer = createServerFn({ method: "GET" })
  .validator(listingIdInputSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<ListingViewer | null> => {
    const listing = await db.query.tradeOffers.findFirst({
      where: { id: data.listingId, kind: "listing" },
      columns: {
        id: true,
        status: true,
        fromUserId: true,
        fromAddress: true,
        unitSize: true,
        updatedAt: true,
      },
      with: {
        items: { where: { leftAt: { isNull: true } }, orderBy: { id: "asc" } },
        wants: storedWants,
        fromUser: {
          columns: { banned: true, banExpires: true },
          with: { cosmoAccount: posterLinkColumns },
        },
      },
    });
    if (!listing) return null;
    const viewerId = context.session?.user.id;
    if (viewerId === undefined) return { role: "anonymous" };
    // trade_offers_unit_size_chk: every listing has a unit size
    if (listing.unitSize === null) {
      throw new Error(`listing ${listing.id} has no unit`);
    }
    const { unitSize } = listing;
    const own = listing.fromUserId === viewerId;
    const wants = listing.wants.map((want) => storedWantSchema.parse(want));
    const pool = listing.items.map(
      (item) => storedObjektItemSchema.parse(item).tokenId,
    );

    if (listing.status !== "open") {
      const trades = await readListingTrades(
        listing.id,
        own ? undefined : viewerId,
      );
      return {
        role: "closed",
        tradeId: trades.find((trade) => trade.status !== "pending")?.id ?? null,
      };
    }
    if (own) {
      return {
        role: "poster",
        ...(await readPosterSide({
          id: listing.id,
          fromAddress: listing.fromAddress,
          unitSize,
          wants,
          pool,
          posterRefused:
            posterRefusal(
              {
                wantKinds: wants.map((want) => want.kind),
                poster: listing.fromUser && toPosterAccount(listing.fromUser),
              },
              listing.fromAddress,
            ) !== null,
        })),
      };
    }

    // a claimer holds one live trade or pending offer per listing
    const [trade] = (await readListingTrades(listing.id, viewerId)).filter(
      (row) => openTradeStatuses.some((status) => status === row.status),
    );
    if (trade?.status === "pending" && trade.expiresAt !== null) {
      return {
        role: "offerer",
        tradeId: trade.id,
        expiresAt: trade.expiresAt,
        ...(await offerSides(trade)),
      };
    }
    if (trade !== undefined) {
      return {
        role: "claimer",
        tradeId: trade.id,
        deadlineAt: trade.status === "disputed" ? null : trade.deadlineAt,
        size: tradeSize(trade),
      };
    }

    const { address, ...standing } = await claimStanding(db, viewerId);
    if (address === null) return { role: "unlinked" };
    const endedOffer = await readEndedOffer(listing.id, viewerId);

    const holdings = await readTokenStates(listing.fromAddress, pool);
    const availability = pool.map((tokenId) => ({
      tokenId,
      availability: poolAvailability(
        { tokenId, leftAt: null },
        holdings.states.get(tokenId),
        listing.fromAddress,
        holdings,
      ),
    }));
    // whether the poster's account stops a claim is $fetchTradeListing's `blocked`
    return {
      role: "candidate",
      updatedAt: listing.updatedAt,
      takesOffers: takesOffers(wants),
      pool: availability,
      ...(await readCandidateSide(address, wants, {
        free: availability.filter((item) => item.availability.kind === "free")
          .length,
        unitSize,
      })),
      claims: { active: standing.active, cap: claimCap(standing) },
      ownAddress: isEqual(address, listing.fromAddress),
      endedOffer,
    };
  });
