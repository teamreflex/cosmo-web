import type { ValidSort } from "@apollo/cosmo/types/common";

type SortableListItem = {
  slug: string;
  member: string;
  collectionNo: string;
  entryCreatedAt: string;
};

type SortLookups = {
  // member name → canonical member sort order, for member sorts
  memberOrder?: Map<string, number>;
  // collection slug → mint count, for mint sorts
  mintCounts?: Map<string, number>;
};

/**
 * Sort list items by the selected sort, applied after entry projection so
 * per-entry rendering stays consistent across types. Newest/oldest order by
 * when the entry was added to the list (not when the collection released),
 * and other sorts break ties between entries of the same collection the
 * same way. Sorts that don't apply to lists fall back to newest.
 */
export function sortObjektListItems<T extends SortableListItem>(
  items: T[],
  sort: ValidSort,
  { memberOrder, mintCounts }: SortLookups,
) {
  // newest-added entry first, also breaks ties within a collection
  const newestAdded = (a: T, b: T) =>
    b.entryCreatedAt.localeCompare(a.entryCreatedAt);

  switch (sort) {
    case "oldest":
      items.sort((a, b) => a.entryCreatedAt.localeCompare(b.entryCreatedAt));
      return;
    case "noAscending":
      items.sort(
        (a, b) =>
          a.collectionNo.localeCompare(b.collectionNo) || newestAdded(a, b),
      );
      return;
    case "noDescending":
      items.sort(
        (a, b) =>
          b.collectionNo.localeCompare(a.collectionNo) || newestAdded(a, b),
      );
      return;
    case "memberAsc":
      items.sort(
        (a, b) =>
          memberRank(a, memberOrder) - memberRank(b, memberOrder) ||
          a.collectionNo.localeCompare(b.collectionNo) ||
          newestAdded(a, b),
      );
      return;
    case "memberDesc":
      items.sort(
        (a, b) =>
          memberRank(b, memberOrder) - memberRank(a, memberOrder) ||
          a.collectionNo.localeCompare(b.collectionNo) ||
          newestAdded(a, b),
      );
      return;
    case "mintsAsc":
      items.sort(
        (a, b) =>
          mintRank(a, mintCounts) - mintRank(b, mintCounts) ||
          newestAdded(a, b),
      );
      return;
    case "mintsDesc":
      items.sort(
        (a, b) =>
          mintRank(b, mintCounts) - mintRank(a, mintCounts) ||
          newestAdded(a, b),
      );
      return;
    default:
      items.sort(newestAdded);
  }
}

/**
 * Resolve a member's canonical sort position, falling back to last for any
 * member missing from the synced member table.
 */
function memberRank(
  item: SortableListItem,
  memberOrder: Map<string, number> | undefined,
) {
  return memberOrder?.get(item.member) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Resolve a collection's mint count. Every collection with objekts has a
 * count, so a missing one only happens for a collection with none.
 */
function mintRank(
  item: SortableListItem,
  mintCounts: Map<string, number> | undefined,
) {
  return mintCounts?.get(item.slug) ?? 0;
}
