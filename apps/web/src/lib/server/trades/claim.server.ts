import { isBanActive } from "@apollo/auth/guard";
import {
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import type {
  NewTradeOfferItem,
  TradeOfferStatus,
} from "@apollo/database/web/types";
import { validateAssignment } from "@apollo/trades/assignment";
import { claimCap } from "@apollo/trades/caps";
import { listingTransition } from "@apollo/trades/lifecycle";
import type { ClaimListingInput } from "@apollo/trades/listing";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import { isEqual } from "@apollo/util";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type * as z from "zod";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type {
  ClaimTokenRefusal,
  TradeErrorCode,
} from "../../universal/errors/trades";
import {
  type StoredWant,
  storedObjektItemSchema,
  storedWantSchema,
  toTradeWant,
} from "../../universal/trade-listings";
import { getCosmoAddress } from "../cosmo-accounts.server";
import { db, type DbOrTx, type WebTx } from "../db";
import { isPostgresError } from "../util.server";
import { activeClaimCount } from "./detail.server";
import {
  firstRefusal,
  readIndexerTokens,
  readWebTokenFlags,
  type TokenState,
} from "./holdings.server";
import type { ListingActor } from "./listings.server";
import {
  type PosterFacts,
  posterRefusal,
  readPosterAccount,
  readPosterFacts,
} from "./poster.server";
import { insertTradeEvent, notifyUsers } from "./trade.server";

function refuse(code: TradeErrorCode | AuthErrorCode): never {
  throw new ExpectedError(code);
}

/**
 * Refuses a picked token the claimer can't give, naming it and why, so the
 * confirm dialog can say which serial to swap.
 */
function refuseToken({ tokenId, reason }: ClaimTokenRefusal): never {
  throw new ExpectedError("claim_token_unavailable", { tokenId, reason });
}

/**
 * Why a listing can't be claimed on the terms the claimer saw, judged on
 * its status first: a claimed or closed listing says so even when the
 * claimer's view is also stale.
 */
function statusRefusal(
  listing: { status: TradeOfferStatus; updatedAt: Date } | undefined,
  seen: Date,
): TradeErrorCode | null {
  if (!listing) return "listing_not_found";
  if (listing.status === "claimed") return "already_claimed";
  if (listing.status !== "open") return "listing_closed";
  return listing.updatedAt.getTime() === seen.getTime()
    ? null
    : "listing_updated";
}

function listingStatus(executor: DbOrTx, id: string) {
  return executor
    .select({ status: tradeOffers.status, updatedAt: tradeOffers.updatedAt })
    .from(tradeOffers)
    .where(eq(tradeOffers.id, id));
}

type Preflight = {
  listing: {
    id: string;
    fromUserId: string | null;
    fromAddress: string;
    items: z.output<typeof storedObjektItemSchema>[];
    wants: StoredWant[];
  };
  poster: PosterFacts;
  submitted: number[];
  claimerStates: ReadonlyMap<number, TokenState>;
};

/**
 * The checks that need no lock, in claim precedence: the listing, its
 * status and the claimer's view of it, the poster's side, then the
 * submitted tokens. Assignment is checked on every submitted token's
 * indexer values whoever owns it, so a misfit row is refused the same way
 * however the tokens are held.
 */
export async function preflightClaim(
  actor: ListingActor,
  input: ClaimListingInput,
): Promise<Preflight> {
  const row = await db.query.tradeOffers.findFirst({
    where: { id: input.listingId, kind: "listing" },
    columns: {
      id: true,
      status: true,
      fromUserId: true,
      fromAddress: true,
      updatedAt: true,
    },
    with: {
      items: { orderBy: { id: "asc" } },
      wants: { orderBy: { id: "asc" } },
    },
  });
  if (!row) refuse("listing_not_found");
  if (
    row.fromUserId === actor.userId ||
    isEqual(row.fromAddress, actor.address)
  ) {
    refuse("listing_own");
  }
  const stale = statusRefusal(row, input.seen);
  if (stale) refuse(stale);

  const listing = {
    id: row.id,
    fromUserId: row.fromUserId,
    fromAddress: row.fromAddress,
    items: row.items.map((item) => storedObjektItemSchema.parse(item)),
    wants: row.wants.map((want) => storedWantSchema.parse(want)),
  };
  const submitted = input.rows.flat();
  const [poster, claimerStates] = await Promise.all([
    readPosterFacts({
      fromUserId: listing.fromUserId,
      fromAddress: listing.fromAddress,
      tokenIds: listing.items.map((item) => item.tokenId),
      wantKinds: listing.wants.map((want) => want.kind),
    }),
    readIndexerTokens(submitted),
  ]);
  if (posterRefusal(poster, listing.fromAddress)) {
    // a claim or edit committed since the status read is the better answer
    const [now] = await listingStatus(db, listing.id);
    refuse(statusRefusal(now, input.seen) ?? "listing_unavailable");
  }

  const states = [...claimerStates.values()];
  const missing = states.find((state) => state.kind === "missing");
  if (missing) {
    refuseToken({ tokenId: missing.tokenId, reason: "not_owned" });
  }
  const found = states.flatMap((state) =>
    state.kind === "found" ? [state] : [],
  );
  // posterRefusal has refused payment rows, so every want is an objekt row
  const assignment = validateAssignment(
    listing.wants.flatMap((want) => toTradeWant(want) ?? []),
    input.rows,
    new Map(found.map((state) => [state.tokenId, state.attributes])),
  );
  if (!assignment.ok) refuse("claim_assignment_invalid");

  // locks and live trades are read under the lock, after the account checks
  const unflagged = firstRefusal(
    submitted,
    { states: claimerStates, locked: new Set(), live: new Set() },
    actor.address,
  );
  if (unflagged) refuseToken(unflagged);
  return { listing, poster, submitted, claimerStates };
}

/**
 * Re-judges the poster's side on what can change under the lock: their
 * account, ban and link, and the locks and live trades on the offered
 * tokens. The indexer values come from the preflight.
 */
async function recheckPoster(tx: WebTx, { listing, poster }: Preflight) {
  const account = await readPosterAccount(tx, listing.fromUserId);
  const flags = await readWebTokenFlags(
    tx,
    listing.fromAddress,
    poster.tokenIds,
  );
  const facts = {
    ...poster,
    holdings: { states: poster.holdings.states, ...flags },
    poster: account,
  };
  if (posterRefusal(facts, listing.fromAddress)) refuse("listing_unavailable");
}

/**
 * Locks both users' rows in one statement ordered by id, so a claim can't
 * deadlock against a crossed claim or interleave with a deletion or ban,
 * and the claimer's parallel claims queue for the cap. Then claims the
 * listing behind its status and `updated_at` guard, which takes the
 * listing's row lock: a claim or edit that committed while this one waited
 * leaves no row to update, and the re-read says which. Then repeats every
 * check that could have changed; a refusal rolls the claim back. Returns
 * the claimer's COSMO address as stored, which the trade pins, and the
 * poster's locked row, missing when the listing has no poster.
 */
export async function lockAndRecheck(
  tx: WebTx,
  actor: ListingActor,
  input: ClaimListingInput,
  preflight: Preflight,
) {
  const { listing } = preflight;
  const users = await tx
    .select({ id: user.id, banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(
      inArray(
        user.id,
        listing.fromUserId === null
          ? [actor.userId]
          : [actor.userId, listing.fromUserId],
      ),
    )
    .orderBy(asc(user.id))
    .for("no key update");
  const claimer = users.find((row) => row.id === actor.userId);
  if (!claimer) refuse("not_signed_in");

  const { from, to } = listingTransition("claim");
  const [claimed] = await tx
    .update(tradeOffers)
    .set({ status: to, updatedAt: bumpUpdatedAt })
    .where(
      and(
        eq(tradeOffers.id, listing.id),
        inArray(tradeOffers.status, [...from]),
        eq(tradeOffers.updatedAt, input.seen),
      ),
    )
    .returning({ id: tradeOffers.id });
  if (!claimed) {
    const [row] = await listingStatus(tx, listing.id);
    refuse(statusRefusal(row, input.seen) ?? "listing_updated");
  }

  await recheckPoster(tx, preflight);
  if (isBanActive(claimer)) refuse("forbidden");

  const link = await getCosmoAddress(tx, actor.userId);
  if (link.kind === "none" || !isEqual(link.address, actor.address)) {
    refuse("cosmo_not_linked");
  }
  if (
    (await activeClaimCount(tx, actor.userId)) >=
    claimCap({ positive: 0, abandoned: 0 })
  ) {
    refuse("claim_cap_reached");
  }

  const flags = await readWebTokenFlags(tx, actor.address, preflight.submitted);
  const refusal = firstRefusal(
    preflight.submitted,
    { states: preflight.claimerStates, ...flags },
    actor.address,
  );
  if (refusal) refuseToken(refusal);
  return {
    toAddress: link.address,
    poster: users.find((row) => row.id === listing.fromUserId),
  };
}

/**
 * Inserts live items, turning a clash on the live-token index (a token
 * another trade made live after the checks read it) into `refusal`.
 */
async function insertLiveItems(
  tx: WebTx,
  values: NewTradeOfferItem[],
  refusal: TradeErrorCode,
) {
  try {
    await tx.insert(tradeOfferItems).values(values);
  } catch (error) {
    if (isPostgresError(error, "23505", "trade_offer_items_live_token_idx")) {
      refuse(refusal);
    }
    throw error;
  }
}

/**
 * Creates the accepted trade for the claimed listing with both addresses
 * pinned and the fixed claim window, and copies both sides' tokens into it
 * as live items. The poster's keep the listing's id. Starts the trade's
 * timeline and tells the poster what to send.
 */
export async function insertTrade(
  tx: WebTx,
  actor: ListingActor,
  { listing, submitted, claimerStates }: Preflight,
  { toAddress, poster }: Awaited<ReturnType<typeof lockAndRecheck>>,
) {
  const [trade] = await tx
    .insert(tradeOffers)
    .values({
      kind: "trade",
      status: "accepted",
      fromUserId: listing.fromUserId,
      toUserId: actor.userId,
      fromAddress: listing.fromAddress,
      toAddress,
      acceptedAt: sql`now()`,
      deadlineAt: sql`now() + make_interval(secs => ${CLAIM_WINDOW / 1000})`,
    })
    .returning({ id: tradeOffers.id });
  if (!trade) throw new Error("Trade insert returned no row");

  await insertLiveItems(
    tx,
    listing.items.map(({ tokenId, attributes }) => ({
      offerId: trade.id,
      listingId: listing.id,
      sender: "from",
      kind: "objekt",
      live: true,
      tokenId,
      ...attributes,
    })),
    "listing_unavailable",
  );
  await insertLiveItems(
    tx,
    submitted.flatMap((tokenId) => {
      const state = claimerStates.get(tokenId);
      return state?.kind === "found"
        ? [
            {
              offerId: trade.id,
              sender: "to",
              kind: "objekt",
              live: true,
              tokenId,
              ...state.attributes,
            } satisfies NewTradeOfferItem,
          ]
        : [];
    }),
    "claim_token_unavailable",
  );
  await insertTradeEvent(tx, trade.id, { type: "accepted" });
  await notifyUsers(tx, poster ? [poster] : [], {
    type: "listing_claimed",
    offerId: trade.id,
    actorId: actor.userId,
    tokenId: null,
  });
  return { tradeId: trade.id };
}
