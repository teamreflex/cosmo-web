export const collectionErrorCodes = [
  "collection_not_found",
  "collection_no_objekt",
  "invalid_season_for_artist",
  "invalid_class_for_artist",
  "metadata_fetch_failed",
] as const;

export type CollectionErrorCode = (typeof collectionErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known collection error code.
 */
export function isCollectionErrorCode(
  value: string,
): value is CollectionErrorCode {
  return collectionErrorCodes.some((code) => code === value);
}
