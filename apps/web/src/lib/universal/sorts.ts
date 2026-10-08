import { validSorts, type ValidSort } from "@apollo/cosmo/types/common";

/**
 * Sorts that only order collections, so they work on any collection listing:
 * the spin account and Typesense search offer just these.
 */
export const collectionSorts = [
  "newest",
  "oldest",
  "noAscending",
  "noDescending",
  "memberAsc",
  "memberDesc",
] as const satisfies readonly ValidSort[];
export type CollectionSort = (typeof collectionSorts)[number];

/**
 * Sorts offered on the objekt index and objekt lists.
 */
export const indexSorts = [
  ...collectionSorts,
  "mintsAsc",
  "mintsDesc",
] as const satisfies readonly ValidSort[];
export type IndexSort = (typeof indexSorts)[number];

/**
 * Sorts offered on a user's collection, which has serials and owned copies.
 */
export const profileSorts = validSorts;

/**
 * The sort a surface applies: the selected sort when it supports it,
 * otherwise newest.
 */
export function supportedSort<S extends ValidSort>(
  sort: ValidSort | null | undefined,
  sorts: readonly S[],
): S | "newest" {
  return sorts.find((s) => s === sort) ?? "newest";
}
