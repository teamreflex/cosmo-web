import { toPublicUser } from "@/lib/server/auth.server";
import { getCosmoAddress } from "@/lib/server/cosmo-accounts.server";
import { db } from "@/lib/server/db";
import {
  authenticatedMiddleware,
  authMiddleware,
  cosmoMiddleware,
} from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import {
  insertTrade,
  lockAndRecheck,
  preflightClaim,
} from "@/lib/server/trades/claim.server";
import {
  activeClaimCount,
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
  bumpUpdatedAt,
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
  posterRefusal,
  readPosterAccount,
  readPosterFacts,
} from "@/lib/server/trades/poster.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
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
import { and, eq, inArray, or, sql } from "drizzle-orm";

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
 * address, the note, its items and its wants. Refusals follow a fixed
 * order: the poster, then the listing (missing or not theirs, claimed,
 * closed), then the wants, then the offered tokens. `created_at` never
 * changes, so the listing keeps its place in the feed.
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
          note: data.note,
          updatedAt: bumpUpdatedAt,
        })
        .where(eq(tradeOffers.id, data.listingId));
      await tx
        .delete(tradeOfferItems)
        .where(eq(tradeOfferItems.offerId, data.listingId));
      await tx
        .delete(tradeListingWants)
        .where(eq(tradeListingWants.listingId, data.listingId));
      await insertTerms(tx, data.listingId, terms);
      return { kind: "saved", listingId: data.listingId };
    });
  });

/**
 * Close the caller's open listing. Anyone else's listing, and any trade
 * row, is not found whatever its status; the poster's own claimed or closed
 * listing says which.
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
 * Accept a listing with the tokens the claimer picked, one list per want
 * row, as of the listing's `updated_at` they saw: exactly one trade per
 * listing, whoever else is accepting it. Every refusal is an ExpectedError
 * and writes nothing. The order they're checked in is fixed, so the same
 * request always gets the same answer.
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
    return db.transaction(async (tx) => {
      const toAddress = await lockAndRecheck(tx, actor, data, preflight);
      return insertTrade(tx, actor, preflight, toAddress);
    });
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
    const [locked, live] = await Promise.all([
      db
        .selectDistinct({ tokenId: lockedObjekts.tokenId })
        .from(lockedObjekts)
        .where(
          and(
            eq(lockedObjekts.address, address),
            eq(lockedObjekts.locked, true),
          ),
        )
        .orderBy(lockedObjekts.tokenId),
      db
        .selectDistinct({ tokenId: tradeOfferItems.tokenId })
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
        )
        .orderBy(tradeOfferItems.tokenId),
    ]);

    return {
      locked: locked.map((row) => row.tokenId),
      live: live.flatMap((row) => row.tokenId ?? []),
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
      },
      with: {
        items: { orderBy: { id: "asc" } },
        wants: { orderBy: { id: "asc" } },
        fromUser: true,
        fromCosmo: { columns: { username: true } },
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
    const tokenIds = listing.items.map((item) => item.tokenId);
    // a claimed listing's trade runs on as agreed, so only an open one is judged
    const poster =
      state.status === "open"
        ? await Promise.all([
            readWebTokenFlags(db, listing.fromAddress, tokenIds),
            readPosterAccount(db, listing.fromUserId),
          ])
        : null;
    return {
      id: listing.id,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      note: listing.note,
      poster: listing.fromUser && toPublicUser(listing.fromUser),
      cosmoUsername: listing.fromCosmo?.username ?? null,
      items: listing.items,
      wants: listing.wants,
      state,
      blocked:
        poster !== null &&
        posterRefusal(
          {
            tokenIds,
            wantKinds: listing.wants.map((want) => want.kind),
            holdings: { states, ...poster[0] },
            poster: poster[1],
          },
          listing.fromAddress,
        ) !== null,
    };
  });

/**
 * The signed-in viewer's side of a listing, shown in place of Accept, or
 * null when the id isn't a listing. Always the session's own view; signed
 * out, it's anonymous. Only an open listing's candidates are read: closed
 * and claimed listings and the poster's own never touch the viewer's
 * holdings or the poster's.
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
        items: { columns: { tokenId: true }, orderBy: { id: "asc" } },
        wants: { orderBy: { id: "asc" } },
      },
    });
    if (!listing) return null;
    const viewerId = context.session?.user.id;
    if (viewerId === undefined) return { role: "anonymous" };

    if (listing.status !== "open" && listing.status !== "claimed") {
      return { role: "closed" };
    }

    const { state, trade } = await readListingState(listing);
    if (listing.fromUserId === viewerId) {
      return {
        role: "poster",
        claim:
          state.status === "claimed"
            ? {
                username: trade?.username ?? null,
                deadlineAt: state.deadlineAt,
              }
            : null,
      };
    }
    if (state.status === "claimed" && trade?.toUserId === viewerId) {
      return { role: "claimer", deadlineAt: state.deadlineAt };
    }

    if (state.status === "claimed") {
      return { role: "onlooker", deadlineAt: state.deadlineAt };
    }

    const link = await getCosmoAddress(db, viewerId);
    if (link.kind === "none") return { role: "unlinked" };

    const wants = listing.wants.map((want) => storedWantSchema.parse(want));
    const [facts, side, active] = await Promise.all([
      readPosterFacts({
        fromUserId: listing.fromUserId,
        fromAddress: listing.fromAddress,
        tokenIds: listing.items.flatMap((item) => item.tokenId ?? []),
        wantKinds: wants.map((want) => want.kind),
      }),
      readCandidateSide(link.address, wants),
      activeClaimCount(db, viewerId),
    ]);

    return {
      role: "candidate",
      updatedAt: listing.updatedAt,
      ...side,
      claims: { active, cap: claimCap({ positive: 0, abandoned: 0 }) },
      blocked:
        posterRefusal(facts, listing.fromAddress) !== null ||
        isEqual(link.address, listing.fromAddress),
    };
  });
