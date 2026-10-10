import { type ObjektAttributes, type RangeFilter, matchesRange } from "./range";

/**
 * One row of a listing's trade side: a number of copies of one collection,
 * or a number of distinct objekts anywhere in a range.
 */
export type TradeWant =
  | { kind: "exact"; slug: string; count: number }
  | { kind: "range"; filter: RangeFilter; count: number };

export type InventoryObjekt = ObjektAttributes & { tokenId: number };

/**
 * The serials picked for one want, in inventory order, and how many it is
 * still short.
 */
export type WantAllocation = { tokenIds: number[]; missing: number };

/**
 * Pick serials from the inventory for every want, each serial used once.
 * Exact rows go first, since every copy of a collection is interchangeable
 * to the ranges. Ranges follow, narrowest first, each taking candidates in
 * inventory order. When that greedy pass leaves a row short, augmenting
 * paths move serials between rows to free one up, so the result is short
 * only when no assignment could cover every row.
 */
export function allocate(
  wants: readonly TradeWant[],
  inventory: readonly InventoryObjekt[],
): WantAllocation[] {
  const rows = wants.map((want) => ({
    want,
    // inventory indexes this want could take, in inventory order
    candidates: inventory.flatMap((objekt, index) => {
      const matches =
        want.kind === "exact"
          ? objekt.slug === want.slug
          : matchesRange(want.filter, objekt);
      return matches ? [index] : [];
    }),
    picks: new Set<number>(),
  }));
  type Row = (typeof rows)[number];
  const owners = new Map<number, Row>();

  const order = rows.toSorted((a, b) => {
    if (a.want.kind !== b.want.kind) return a.want.kind === "exact" ? -1 : 1;
    return a.want.kind === "exact"
      ? 0
      : a.candidates.length - b.candidates.length;
  });

  for (const row of order) {
    for (const candidate of row.candidates) {
      if (row.picks.size === row.want.count) break;
      if (owners.has(candidate)) continue;
      owners.set(candidate, row);
      row.picks.add(candidate);
    }
  }

  /**
   * Find another serial for `row`: a free candidate, or one held by another
   * row that can take a different serial in its place.
   */
  function augment(row: Row, visited: Set<number>): boolean {
    for (const candidate of row.candidates) {
      if (visited.has(candidate) || row.picks.has(candidate)) continue;
      visited.add(candidate);

      const holder = owners.get(candidate);
      if (holder === undefined || augment(holder, visited)) {
        holder?.picks.delete(candidate);
        owners.set(candidate, row);
        row.picks.add(candidate);
        return true;
      }
    }
    return false;
  }

  for (const row of order) {
    while (row.picks.size < row.want.count && augment(row, new Set())) {
      // each pass adds one serial to this row without shrinking another
    }
  }

  return rows.map(({ want, picks }) => ({
    tokenIds: [...picks]
      .toSorted((a, b) => a - b)
      .flatMap((candidate) => inventory[candidate]?.tokenId ?? []),
    missing: want.count - picks.size,
  }));
}

/**
 * Whether every want got all its serials.
 */
export function isFullyAllocated(allocation: readonly WantAllocation[]) {
  return allocation.every((row) => row.missing === 0);
}
