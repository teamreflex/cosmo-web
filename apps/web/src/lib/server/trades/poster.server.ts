import { isBanActive } from "@apollo/auth/guard";
import { isEqual } from "@apollo/util";

/**
 * The relational `with` that loads a poster's COSMO link with their user row.
 */
export const posterLinkColumns = {
  columns: { address: true, username: true },
} as const;

/**
 * Whether the poster's account stops the listing from being claimed at
 * all: the poster is gone (null) or banned, or their COSMO link
 * (`cosmoAccount`, read with posterLinkColumns) no longer matches
 * `fromAddress`. The listing page disables Accept on the same verdict that
 * refuses the claim, and on too few free objekts (listingStop()).
 */
export function posterBlocked(
  poster: {
    banned: boolean;
    banExpires: Date | null;
    cosmoAccount: { address: string } | null;
  } | null,
  fromAddress: string,
  now = new Date(),
) {
  return (
    poster === null ||
    isBanActive(poster, now) ||
    poster.cosmoAccount === null ||
    !isEqual(poster.cosmoAccount.address, fromAddress)
  );
}
