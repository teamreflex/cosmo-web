import { isBanActive } from "@apollo/auth/guard";
import { tradeOfferItems, tradeOffers } from "@apollo/database/web/schema";
import type {
  NewTradeOfferItem,
  TradeOfferStatus,
} from "@apollo/database/web/types";
import { scaleWants } from "@apollo/trades/allocate";
import { validateAssignment } from "@apollo/trades/assignment";
import { claimCap } from "@apollo/trades/caps";
import type { ClaimListingInput } from "@apollo/trades/listing";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import { isEqual } from "@apollo/util";
import { and, eq, sql } from "drizzle-orm";
import type * as z from "zod";
import type { AuthErrorCode } from "../../universal/errors/auth";
import { ExpectedError } from "../../universal/errors/expected";
import type {
  ListingPickRefusal,
  TradeErrorCode,
} from "../../universal/errors/trades";
import {
  storedObjektItemSchema,
  type StoredWant,
  storedWantSchema,
  toTradeWant,
} from "../../universal/trade-listings";
import { db, type DbOrTx, type WebTx } from "../db";
import { claimStanding } from "./detail.server";
import {
  firstRefusal,
  readIndexerTokens,
  readTokenStates,
  readWebTokenFlags,
  type TokenState,
} from "./holdings.server";
import type { ListingActor } from "./listings.server";
import {
  type PosterAccount,
  type PosterFacts,
  posterLinkColumns,
  posterRefusal,
  toPosterAccount,
} from "./poster.server";
import {
  insertTradeEvent,
  lockParties,
  notifyUsers,
  readLockedLinks,
  refuseLiveClash,
  refuseToken,
} from "./trade.server";

function refuse(code: TradeErrorCode | AuthErrorCode): never {
  throw new ExpectedError(code);
}

/**
 * Refuses a claim whose pick of the poster's objekts includes one they
 * can't give right now, naming it, so the picker can drop it.
 */
function refusePick(tokenId: number): never {
  throw new ExpectedError("listing_pick_unavailable", {
    tokenId,
  } satisfies ListingPickRefusal);
}

/**
 * Why a listing can't be claimed on the terms the claimer saw, judged on
 * its status first: a closed listing says so even when the claimer's view
 * is also stale.
 */
function statusRefusal(
  listing: { status: TradeOfferStatus; updatedAt: Date } | undefined,
  seen: Date,
): TradeErrorCode | null {
  if (!listing) return "listing_not_found";
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
    picked: z.output<typeof storedObjektItemSchema>[];
    wants: StoredWant[];
  };
  poster: PosterFacts;
  pickedStates: ReadonlyMap<number, TokenState>;
  submitted: number[];
  claimerStates: ReadonlyMap<number, TokenState>;
};

/**
 * The checks that need no lock, in claim precedence: the listing, its
 * status and the claimer's view of it, the poster's account, the poster's
 * objekts the claim picked, then the claimer's tokens. The picks must be
 * `units` units of the pool, each one the poster can give now. Assignment
 * is checked against the want rows scaled to the units, on every submitted
 * token's indexer values whoever owns it, so a misfit row is refused the
 * same way however the tokens are held.
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
      unitSize: true,
      updatedAt: true,
    },
    with: {
      items: { where: { leftAt: { isNull: true } }, orderBy: { id: "asc" } },
      wants: { orderBy: { id: "asc" } },
      fromUser: {
        columns: { banned: true, banExpires: true },
        with: { cosmoAccount: posterLinkColumns },
      },
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
  // trade_offers_unit_size_chk: every listing has a unit size
  if (row.unitSize === null) throw new Error(`listing ${row.id} has no unit`);

  const wants = row.wants.map((want) => storedWantSchema.parse(want));
  const poster: PosterFacts = {
    wantKinds: wants.map((want) => want.kind),
    poster: row.fromUser && toPosterAccount(row.fromUser),
  };
  // a commit since the status read is the better answer to a refused pick
  const refuseAfterRecheck = async (refusal: () => never) => {
    const [now] = await listingStatus(db, row.id);
    const changed = statusRefusal(now, input.seen);
    if (changed) refuse(changed);
    refusal();
  };
  if (posterRefusal(poster, row.fromAddress)) {
    await refuseAfterRecheck(() => refuse("listing_unavailable"));
  }

  const pool = new Map(
    row.items.map((item) => {
      const parsed = storedObjektItemSchema.parse(item);
      return [parsed.tokenId, parsed];
    }),
  );
  const picked = input.picked.flatMap((tokenId) => pool.get(tokenId) ?? []);
  if (
    picked.length !== input.picked.length ||
    picked.length !== input.units * row.unitSize
  ) {
    refuse("claim_assignment_invalid");
  }

  const submitted = input.rows.flat();
  const [pickedHoldings, claimerStates] = await Promise.all([
    readTokenStates(row.fromAddress, input.picked),
    readIndexerTokens(submitted),
  ]);
  const unavailable = firstRefusal(
    input.picked,
    pickedHoldings,
    row.fromAddress,
  );
  if (unavailable) {
    await refuseAfterRecheck(() => refusePick(unavailable.tokenId));
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
    scaleWants(
      wants.flatMap((want) => toTradeWant(want) ?? []),
      input.units,
    ),
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
  return {
    listing: {
      id: row.id,
      fromUserId: row.fromUserId,
      fromAddress: row.fromAddress,
      picked,
      wants,
    },
    poster,
    pickedStates: pickedHoldings.states,
    submitted,
    claimerStates,
  };
}

/**
 * Re-judges the poster's side on what can change under the lock: their
 * account, ban and link, as the lock read them, and the locks and live
 * trades on the picked objekts. The indexer values come from the preflight.
 */
async function recheckPoster(
  tx: WebTx,
  { listing, poster, pickedStates }: Preflight,
  account: PosterAccount | null,
) {
  if (posterRefusal({ ...poster, poster: account }, listing.fromAddress)) {
    refuse("listing_unavailable");
  }
  const tokenIds = listing.picked.map(({ tokenId }) => tokenId);
  const flags = await readWebTokenFlags(tx, listing.fromAddress, tokenIds);
  const unavailable = firstRefusal(
    tokenIds,
    { states: pickedStates, ...flags },
    listing.fromAddress,
  );
  if (unavailable) refusePick(unavailable.tokenId);
}

/**
 * Whether the claimer already has a live trade from the listing: its
 * poster's items keep the listing's id, and only a live trade's are live.
 */
async function hasLiveClaim(tx: WebTx, listingId: string, userId: string) {
  const [claim] = await tx
    .select({ id: tradeOffers.id })
    .from(tradeOfferItems)
    .innerJoin(tradeOffers, eq(tradeOffers.id, tradeOfferItems.offerId))
    .where(
      and(
        eq(tradeOfferItems.listingId, listingId),
        eq(tradeOfferItems.live, true),
        eq(tradeOffers.toUserId, userId),
      ),
    )
    .limit(1);
  return claim !== undefined;
}

/**
 * Locks both users' rows in one statement ordered by id, so a claim can't
 * deadlock against a crossed claim or interleave with a deletion or ban,
 * and the claimer's parallel claims queue for the cap, which their linked
 * address's feedback score sets, and reads their COSMO links under the
 * locks. Then locks the listing row behind its status and `updated_at`
 * guard without changing it, so claims on one listing queue behind each
 * other and an edit or a drop: one that committed while this one waited
 * leaves no row to lock, and the re-read says which. A claim racing a trade
 * from another listing for the same token is caught by the live-token index
 * on insert. Then repeats every check that could have changed, refusing a
 * claimer who already has a live trade from the listing; a refusal rolls
 * the claim back. Returns the claimer's COSMO address as stored, which the
 * trade pins, and the poster's locked row, missing when the listing has no
 * poster.
 */
export async function lockAndRecheck(
  tx: WebTx,
  actor: ListingActor,
  input: ClaimListingInput,
  preflight: Preflight,
) {
  const { listing } = preflight;
  const users = await lockParties(
    tx,
    [actor.userId, listing.fromUserId],
    "no key update",
  );
  const links = await readLockedLinks(tx, [actor.userId, listing.fromUserId]);
  const claimer = users.find((row) => row.id === actor.userId);
  if (!claimer) refuse("not_signed_in");
  const poster = users.find((row) => row.id === listing.fromUserId);
  const posterLink = poster && links.get(poster.id);
  const claimerAddress = links.get(actor.userId)?.address;

  const [locked] = await tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.id, listing.id),
        eq(tradeOffers.status, "open"),
        eq(tradeOffers.updatedAt, input.seen),
      ),
    )
    .for("no key update");
  if (!locked) {
    const [row] = await listingStatus(tx, listing.id);
    refuse(statusRefusal(row, input.seen) ?? "listing_updated");
  }

  await recheckPoster(
    tx,
    preflight,
    poster === undefined
      ? null
      : {
          banned: poster.banned,
          banExpires: poster.banExpires,
          link:
            posterLink === undefined
              ? { kind: "none" }
              : { kind: "linked", ...posterLink },
        },
  );
  if (isBanActive(claimer)) refuse("forbidden");
  if (claimerAddress === undefined || !isEqual(claimerAddress, actor.address)) {
    refuse("cosmo_not_linked");
  }
  if (await hasLiveClaim(tx, listing.id, actor.userId)) {
    refuse("listing_claim_exists");
  }
  const standing = await claimStanding(tx, actor.userId);
  if (standing.active >= claimCap(standing)) refuse("claim_cap_reached");

  const flags = await readWebTokenFlags(tx, actor.address, preflight.submitted);
  const refusal = firstRefusal(
    preflight.submitted,
    { states: preflight.claimerStates, ...flags },
    actor.address,
  );
  if (refusal) refuseToken(refusal);
  return { toAddress: claimerAddress, poster };
}

/**
 * Creates the accepted trade for the claim with both addresses pinned and
 * the fixed claim window, and copies the poster's picked objekts and the
 * claimer's tokens into it as live items. The poster's keep the listing's
 * id. The listing itself doesn't change. Starts the trade's timeline and
 * tells the poster what to send.
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

  await refuseLiveClash(
    tx.insert(tradeOfferItems).values(
      listing.picked.map(
        ({ tokenId, attributes }) =>
          ({
            offerId: trade.id,
            listingId: listing.id,
            sender: "from",
            kind: "objekt",
            live: true,
            tokenId,
            ...attributes,
          }) satisfies NewTradeOfferItem,
      ),
    ),
    "listing_pick_unavailable",
  );
  await refuseLiveClash(
    tx.insert(tradeOfferItems).values(
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
    ),
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
