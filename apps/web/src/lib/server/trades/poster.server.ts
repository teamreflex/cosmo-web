import { isBanActive } from "@apollo/auth/guard";
import type { TradeWantKind } from "@apollo/database/web/types";
import { isEqual } from "@apollo/util";
import type { CosmoLink } from "../../universal/cosmo-accounts";
import type { TradeErrorCode } from "../../universal/errors/trades";
import { type TokenHoldings, tokenRefusals } from "./holdings.server";

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
  wantKinds: readonly TradeWantKind[];
  poster: PosterAccount | null;
};

/**
 * The relational `with` that loads a poster's COSMO link with their user row.
 */
export const posterLinkColumns = {
  columns: { address: true, username: true },
} as const;

/**
 * A poster's user row, read with posterLinkColumns, as posterRefusal() judges
 * it.
 */
export function toPosterAccount({
  banned,
  banExpires,
  cosmoAccount,
}: {
  banned: boolean;
  banExpires: Date | null;
  cosmoAccount: { address: string; username: string } | null;
}): PosterAccount {
  return {
    banned,
    banExpires,
    link: cosmoAccount ? { kind: "linked", ...cosmoAccount } : { kind: "none" },
  };
}

/**
 * Whether the poster's account or terms stop the listing from being claimed
 * at all: it asks for a payment (not claimable until sales arrive), the
 * poster is gone or banned, or their COSMO link no longer matches
 * `fromAddress`. The listing page disables Accept on the same verdict that
 * refuses the claim, and on too few deliverable objekts (deliverableTokens).
 */
export function posterRefusal(
  facts: PosterFacts,
  fromAddress: string,
  now = new Date(),
): Extract<TradeErrorCode, "listing_unavailable"> | null {
  const unavailable =
    facts.wantKinds.includes("payment") ||
    facts.poster === null ||
    isBanActive(facts.poster, now) ||
    facts.poster.link.kind === "none" ||
    !isEqual(facts.poster.link.address, fromAddress);

  return unavailable ? "listing_unavailable" : null;
}

/**
 * The pool objekts the poster can give right now, in pool order: held by
 * `fromAddress`, transferable, not locked and not live in a trade. A
 * listing can be claimed while at least a unit of them is left.
 */
export function deliverableTokens(
  tokenIds: readonly number[],
  holdings: TokenHoldings,
  fromAddress: string,
) {
  const refused = new Set(
    tokenRefusals(tokenIds, holdings, fromAddress).map(
      ({ tokenId }) => tokenId,
    ),
  );
  return tokenIds.filter((tokenId) => !refused.has(tokenId));
}
