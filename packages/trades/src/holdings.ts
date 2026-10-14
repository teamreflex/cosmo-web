import { addr } from "@apollo/util";

/**
 * Why an offered token can't go into a listing, checked in this order: it
 * isn't in the poster's account (or the indexer doesn't know it), COSMO
 * won't transfer it, the poster locked it, or an accepted trade holds it.
 */
export const tokenRefusalReasons = [
  "not_owned",
  "untransferable",
  "locked",
  "live",
] as const;

export type TokenRefusalReason = (typeof tokenRefusalReasons)[number];

/**
 * Who holds a token in the indexer and whether it can move, or missing when
 * the indexer doesn't know the id.
 */
export type TokenOwnership =
  | { kind: "missing"; tokenId: number }
  | { kind: "found"; tokenId: number; owner: string; transferable: boolean };

/**
 * Which of a set of tokens the address has locked, and which any accepted
 * or disputed trade holds.
 */
export type TokenFlags = {
  locked: ReadonlySet<number>;
  live: ReadonlySet<number>;
};

/**
 * Why the address can't offer the token, checked in a fixed order, or null
 * when it can. Ownership comes first, so a refusal never reveals anything
 * about a token the address doesn't hold.
 */
export function tokenRefusal(
  state: TokenOwnership,
  address: string,
  flags: TokenFlags,
): TokenRefusalReason | null {
  if (state.kind === "missing" || state.owner !== addr(address)) {
    return "not_owned";
  }
  if (!state.transferable) return "untransferable";
  if (flags.locked.has(state.tokenId)) return "locked";
  if (flags.live.has(state.tokenId)) return "live";
  return null;
}

/**
 * Whether the address could offer every token, which decides if a released
 * listing reopens or breaks. A token missing from `states` counts as not
 * owned.
 */
export function canOfferAll(
  tokenIds: readonly number[],
  states: ReadonlyMap<number, TokenOwnership>,
  address: string,
  flags: TokenFlags,
) {
  return tokenIds.every(
    (tokenId) =>
      tokenRefusal(
        states.get(tokenId) ?? { kind: "missing", tokenId },
        address,
        flags,
      ) === null,
  );
}
