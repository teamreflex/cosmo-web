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
  readCandidateSide,
  readListingState,
} from "@/lib/server/trades/detail.server";
import { hydrateListings } from "@/lib/server/trades/feed.server";
import {
  countRangeMatches,
  readTokenStates,
  readWebTokenFlags,
  tokenRefusals,
} from "@/lib/server/trades/holdings.server";
import {
  checkTerms,
  insertTerms,
  listingArrays,
  listingRefusal,
  lockLinkedPoster,
  lockPoster,
  ownListing,
  posterRow,
  recheckTokens,
  refuseEdit,
  refusePoster,
} from "@/lib/server/trades/listings.server";
import {
  deliverableTokens,
  posterLinkColumns,
  posterRefusal,
  toPosterAccount,
} from "@/lib/server/trades/poster.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { toFeedbackRep } from "@/lib/universal/feedback";
import {
  type ListingViewer,
  type ListingWriteResult,
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
import { claimCap } from "@apollo/trades/caps";
import { listingTransition } from "@apollo/trades/lifecycle";
import {
  claimListingInputSchema,
  editListingInputSchema,
  listingIdInputSchema,
  listingInputSchema,
  offeredTokensInputSchema,
} from "@apollo/trades/listing";
import { rangeFilterSchema } from "@apollo/trades/range";
import { isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

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
      const address = await lockLinkedPoster(tx, actor);
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
 * keep their own copies of the objekts they took, whatever the edit drops.
 * `created_at` never changes, so the listing keeps its place in the feed.
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
    const terms = await checkTerms(actor.address, data);
    if (terms.kind === "token_unavailable") return terms;

    return db.transaction(async (tx): Promise<ListingWriteResult> => {
      const address = await lockLinkedPoster(tx, actor);
      const [listing] = await ownListing(tx, actor.userId, data.listingId).for(
        "update",
      );
      refuseEdit(listing);
      const refusal = await recheckTokens(tx, address, terms);
      if (refusal) return refusal;

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
      return { kind: "saved", listingId: data.listingId };
    });
  });

/**
 * Close the caller's open listing; its live trades carry on. Anyone else's
 * listing, and any trade row, is not found whatever its status; the
 * poster's own closed listing says so.
 */
export const $withdrawListing = createServerFn({ method: "POST" })
  .validator(listingIdInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const { from, to } = listingTransition("withdraw");
    await db.transaction(async (tx) => {
      await lockPoster(tx, userId);
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
      if (withdrawn) return;

      const [listing] = await ownListing(tx, userId, data.listingId);
      throw new ExpectedError(listingRefusal(listing) ?? "listing_closed");
    });
  });

/**
 * Accept some units of a listing: the poster's objekts the claimer picked
 * from the pool and the tokens they give, one list per want row, as of the
 * listing's `updated_at` they saw. Each claim is its own trade, and claims
 * on one listing run side by side as long as they pick different objekts;
 * a claimer holds one live trade per listing. Every refusal is an
 * ExpectedError and writes nothing. The order they're checked in is fixed,
 * so the same request always gets the same answer.
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
 * pickable.
 */
export const $fetchTradeTokenStates = createServerFn({ method: "GET" })
  .middleware([cosmoMiddleware])
  .handler(async ({ context }) => {
    const { address } = context.cosmo;
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
 * refuses them.
 */
export const $fetchOfferedTokenRefusals = createServerFn({ method: "GET" })
  .validator(offeredTokensInputSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) =>
    tokenRefusals(
      data.tokenIds,
      await readTokenStates(context.cosmo.address, data.tokenIds),
      context.cosmo.address,
    ),
  );

/**
 * A listing's public detail, or null when the id isn't a listing. It never
 * names who holds a claim: no claimer id, address or tokens, only the
 * deadline.
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
        items: { where: { leftAt: { isNull: true } }, orderBy: { id: "asc" } },
        wants: { orderBy: { id: "asc" } },
        fromUser: { with: { cosmoAccount: posterLinkColumns } },
        fromCosmo: { columns: { username: true } },
        fromStats: { columns: feedbackRepColumns },
      },
    });
    if (!row) return null;

    const [
      {
        listings: [listing],
        states,
      },
      { state },
    ] = await Promise.all([hydrateListings([row]), readListingState(row)]);
    if (!listing) return null;
    // trade_offers_unit_size_chk: every listing has a unit size
    if (row.unitSize === null) throw new Error(`listing ${row.id} has no unit`);
    const { unitSize } = row;
    const tokenIds = listing.items.map((item) => item.tokenId);
    // only an open listing can be claimed, so only an open one is judged
    const flags =
      state.status === "open"
        ? await readWebTokenFlags(db, listing.fromAddress, tokenIds)
        : null;
    return {
      id: listing.id,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      note: listing.note,
      poster: listing.fromUser && toPublicUser(listing.fromUser),
      cosmoUsername: listing.fromCosmo?.username ?? null,
      rep: listing.fromUser && toFeedbackRep(listing.fromStats),
      items: listing.items,
      wants: listing.wants,
      state,
      blocked:
        flags !== null &&
        (posterRefusal(
          {
            wantKinds: listing.wants.map((want) => want.kind),
            poster: listing.fromUser && toPosterAccount(listing.fromUser),
          },
          listing.fromAddress,
        ) !== null ||
          deliverableTokens(tokenIds, { states, ...flags }, listing.fromAddress)
            .length < unitSize),
    };
  });

/**
 * The signed-in viewer's side of a listing, shown in place of Accept, or
 * null when the id isn't a listing. Always the session's own view; signed
 * out, it's anonymous. Only the listing's parties learn its trade's id.
 * Only an open listing's candidates are read: closed and claimed listings
 * and the poster's own never touch the viewer's holdings or the poster's.
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
        updatedAt: true,
        endedAt: true,
      },
      with: {
        wants: { orderBy: { id: "asc" } },
      },
    });
    if (!listing) return null;
    const viewerId = context.session?.user.id;
    if (viewerId === undefined) return { role: "anonymous" };

    const { state, trade } = await readListingState(listing);
    if (state.status !== "open" && state.status !== "claimed") {
      return {
        role: "closed",
        tradeId:
          trade?.fromUserId === viewerId || trade?.toUserId === viewerId
            ? trade.id
            : null,
      };
    }

    if (listing.fromUserId === viewerId) {
      return {
        role: "poster",
        claim:
          state.status === "claimed" && trade !== undefined
            ? {
                tradeId: trade.id,
                username: trade.username,
                deadlineAt: state.deadlineAt,
              }
            : null,
      };
    }
    if (state.status === "claimed" && trade?.toUserId === viewerId) {
      return {
        role: "claimer",
        deadlineAt: state.deadlineAt,
        tradeId: trade.id,
      };
    }

    if (state.status === "claimed") {
      return { role: "onlooker" };
    }

    const { address, ...standing } = await claimStanding(db, viewerId);
    if (address === null) return { role: "unlinked" };

    // whether the poster's side stops a claim is $fetchTradeListing's `blocked`
    return {
      role: "candidate",
      updatedAt: listing.updatedAt,
      rows: await readCandidateSide(
        address,
        listing.wants.map((want) => storedWantSchema.parse(want)),
      ),
      claims: { active: standing.active, cap: claimCap(standing) },
      ownAddress: isEqual(address, listing.fromAddress),
    };
  });
