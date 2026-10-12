import { isBanActive } from "@apollo/auth/guard";
import type { TradeWantKind } from "@apollo/database/web/types";
import { isEqual } from "@apollo/util";
import type { CosmoLink } from "../../universal/cosmo-accounts";
import type { TradeErrorCode } from "../../universal/errors/trades";
import { getCosmoAddress } from "../cosmo-accounts.server";
import { db, type DbOrTx } from "../db";
import {
  firstRefusal,
  readTokenStates,
  type TokenHoldings,
} from "./holdings.server";

/**
 * What the poster-side check needs from a listing: who posted it from which
 * address, the tokens it offers and the kinds of its wants.
 */
export type PosterListing = {
  fromUserId: string | null;
  fromAddress: string;
  tokenIds: readonly number[];
  wantKinds: readonly TradeWantKind[];
};

/**
 * The poster's user row and COSMO link, or null when the listing has no
 * poster or their row is gone.
 */
export type PosterAccount = {
  banned: boolean;
  banExpires: Date | null;
  link: CosmoLink;
};

export type PosterFacts = {
  tokenIds: readonly number[];
  wantKinds: readonly TradeWantKind[];
  holdings: TokenHoldings;
  poster: PosterAccount | null;
};

export async function readPosterAccount(
  executor: DbOrTx,
  fromUserId: string | null,
): Promise<PosterAccount | null> {
  if (fromUserId === null) return null;
  const row = await executor.query.user.findFirst({
    where: { id: fromUserId },
    columns: { banned: true, banExpires: true },
  });
  if (!row) return null;
  return { ...row, link: await getCosmoAddress(executor, fromUserId) };
}

/**
 * Gathers everything posterRefusal() judges, without taking locks.
 */
export async function readPosterFacts(
  listing: PosterListing,
): Promise<PosterFacts> {
  const [holdings, poster] = await Promise.all([
    readTokenStates(listing.fromAddress, listing.tokenIds),
    readPosterAccount(db, listing.fromUserId),
  ]);
  return {
    tokenIds: listing.tokenIds,
    wantKinds: listing.wantKinds,
    holdings,
    poster,
  };
}

/**
 * Whether the poster's side stops the listing from being claimed: it asks
 * for a payment (not claimable until sales arrive), offers nothing, an
 * offered token can't leave `fromAddress`, the poster is gone or banned, or
 * their COSMO link no longer matches `fromAddress`. The listing page
 * disables Accept on the same verdict that refuses the claim.
 */
export function posterRefusal(
  facts: PosterFacts,
  fromAddress: string,
  now = new Date(),
): Extract<TradeErrorCode, "listing_unavailable"> | null {
  const unavailable =
    facts.wantKinds.includes("payment") ||
    facts.tokenIds.length === 0 ||
    firstRefusal(facts.tokenIds, facts.holdings, fromAddress) !== null ||
    facts.poster === null ||
    isBanActive(facts.poster, now) ||
    facts.poster.link.kind === "none" ||
    !isEqual(facts.poster.link.address, fromAddress);

  return unavailable ? "listing_unavailable" : null;
}
