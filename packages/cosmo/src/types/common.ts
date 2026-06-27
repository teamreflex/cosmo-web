export const COSMO_ENDPOINT = "https://api.cosmo.fans";

// artists
export const validArtists = ["artms", "tripleS", "idntt"] as const;
export type ValidArtist = (typeof validArtists)[number];

// sort values
export const validSorts = [
  "newest",
  "oldest",
  "noAscending",
  "noDescending",
  // should not be sent to cosmo
  "serialAsc",
  "serialDesc",
  "memberAsc",
  "memberDesc",
] as const;
export type ValidSort = (typeof validSorts)[number];

/**
 * Member sorts order by the canonical COSMO member order, which requires a
 * join against the indexer member table rather than a plain column.
 */
export function isMemberSort(sort: ValidSort) {
  return sort === "memberAsc" || sort === "memberDesc";
}

// online types
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = (typeof validOnlineTypes)[number];
