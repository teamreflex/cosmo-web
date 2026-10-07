import { validSorts, type ValidSort } from "@apollo/cosmo/types/common";

/**
 * Sorts that only order collections, so they work on any collection listing:
 * the spin account and Typesense search offer just these.
 */
export const collectionSorts: readonly ValidSort[] = [
  "newest",
  "oldest",
  "noAscending",
  "noDescending",
  "memberAsc",
  "memberDesc",
];

/**
 * Sorts offered on the objekt index and objekt lists.
 */
export const indexSorts: readonly ValidSort[] = [
  ...collectionSorts,
  "mintsAsc",
  "mintsDesc",
];

/**
 * Sorts offered on a user's collection, which has serials and owned copies.
 */
export const profileSorts: readonly ValidSort[] = validSorts;

/**
 * The sort a surface applies: the selected sort when it supports it,
 * otherwise newest.
 */
export function supportedSort(
  sort: ValidSort | null | undefined,
  sorts: readonly ValidSort[],
): ValidSort {
  return sort && sorts.includes(sort) ? sort : "newest";
}
