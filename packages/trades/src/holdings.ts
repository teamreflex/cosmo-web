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
  return heldTokenRefusal(state, flags);
}

/**
 * Why a token the address holds can't be offered, in `tokenRefusal`'s
 * order after ownership, or null when it can.
 */
export function heldTokenRefusal(
  token: { tokenId: number; transferable: boolean },
  flags: TokenFlags,
): TokenRefusalReason | null {
  if (!token.transferable) return "untransferable";
  if (flags.locked.has(token.tokenId)) return "locked";
  if (flags.live.has(token.tokenId)) return "live";
  return null;
}

/**
 * Whether the address still holds every token and can transfer it, which
 * decides if a released listing reopens or breaks. A lock doesn't break it,
 * since COSMO ignores Apollo's locks: the reopened listing shows as blocked
 * to claimers until the poster unlocks the token. A token missing from
 * `states` counts as not owned.
 */
export function holdsAll(
  tokenIds: readonly number[],
  states: ReadonlyMap<number, TokenOwnership>,
  address: string,
) {
  return tokenIds.every((tokenId) => {
    const state = states.get(tokenId);
    return (
      state?.kind === "found" &&
      state.owner === addr(address) &&
      state.transferable
    );
  });
}

/**
 * A token's ownership with its serial, once the indexer knows it.
 */
export type SerialOwnership =
  | Extract<TokenOwnership, { kind: "missing" }>
  | (Extract<TokenOwnership, { kind: "found" }> & { serial: number });

/**
 * The copy an offer would trade for one collection.
 */
export type SerialPick = { tokenId: number; serial: number };

/**
 * The copy of each collection an offer would take from one address: the
 * first token the address's list entries name that it can still offer,
 * else its best usable copy (`candidates`, highest serial first), else null
 * when it has none to give. No token is picked for two collections.
 */
export function pickSerials(
  slugs: readonly string[],
  named: ReadonlyMap<string, readonly number[]>,
  states: ReadonlyMap<number, SerialOwnership>,
  address: string,
  flags: TokenFlags,
  candidates: ReadonlyMap<string, readonly SerialPick[]>,
): Record<string, SerialPick | null> {
  const used = new Set<number>();
  return Object.fromEntries(
    slugs.map((slug) => {
      const pick =
        (named.get(slug) ?? []).flatMap((tokenId): SerialPick[] => {
          const state = states.get(tokenId);
          return state?.kind === "found" &&
            !used.has(tokenId) &&
            tokenRefusal(state, address, flags) === null
            ? [{ tokenId, serial: state.serial }]
            : [];
        })[0] ??
        (candidates.get(slug) ?? []).find(
          ({ tokenId }) => !used.has(tokenId),
        ) ??
        null;
      if (pick !== null) used.add(pick.tokenId);
      return [slug, pick];
    }),
  );
}
