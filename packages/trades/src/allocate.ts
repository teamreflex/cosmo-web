import { MAX_PER_ROW, MAX_TOTAL_WANTED } from "./caps";
import { matchesRange, type ObjektAttributes, type RangeFilter } from "./range";

/**
 * One row of a listing's trade side: a number of copies of one collection,
 * a number of distinct objekts anywhere in a range, or a number of objekts
 * in any mix of a set of collections.
 */
export type TradeWant =
  | { kind: "exact"; slug: string; count: number }
  | { kind: "range"; filter: RangeFilter; count: number }
  | { kind: "choice"; slugs: readonly string[]; count: number };

export type InventoryObjekt = ObjektAttributes & { tokenId: number };

/**
 * Whether the objekt can fill the want: the same collection for an exact
 * row, inside the range, or one of the choice row's collections.
 */
export function fitsWant(want: TradeWant, objekt: ObjektAttributes) {
  switch (want.kind) {
    case "exact":
      return objekt.slug === want.slug;
    case "range":
      return matchesRange(want.filter, objekt);
    case "choice":
      return want.slugs.includes(objekt.slug);
  }
}

/**
 * The tokens picked for one want, in inventory order, and how many it is
 * still short.
 */
export type WantAllocation = { tokenIds: number[]; missing: number };

/**
 * Pick tokens from the inventory for every want, each token used once.
 * Exact rows go first, since every copy of a collection is interchangeable
 * to the other rows. Ranges and choice rows follow, fewest candidates first,
 * each taking candidates in inventory order. When that greedy pass leaves a
 * row short, augmenting paths move tokens between rows to free one up, so
 * the result is short only when no assignment could cover every row.
 */
export function allocate(
  wants: readonly TradeWant[],
  inventory: readonly InventoryObjekt[],
): WantAllocation[] {
  const rows = wants.map((want) => ({
    want,
    // inventory indexes this want could take, in inventory order
    candidates: inventory.flatMap((objekt, index) =>
      fitsWant(want, objekt) ? [index] : [],
    ),
    picks: new Set<number>(),
  }));
  type Row = (typeof rows)[number];
  const owners = new Map<number, Row>();

  const isExact = (row: Row) => row.want.kind === "exact";
  const order = rows.toSorted((a, b) => {
    if (isExact(a) !== isExact(b)) return isExact(a) ? -1 : 1;
    return isExact(a) ? 0 : a.candidates.length - b.candidates.length;
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
   * Find another token for `row`: a free candidate, or one held by another
   * row that can take a different token in its place.
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
      // each pass adds one token to this row without shrinking another
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
 * Whether every want got all its tokens.
 */
export function isFullyAllocated(allocation: readonly WantAllocation[]) {
  return allocation.every((row) => row.missing === 0);
}

/**
 * The want rows for a claim of `units` units: every row's count times the
 * units.
 */
export function scaleWants(wants: readonly TradeWant[], units: number) {
  return wants.map((want) => ({ ...want, count: want.count * units }));
}

/**
 * The most units of a listing one claim can take from the inventory, with
 * the allocation at that size. A claim is bounded by the free pool, by the
 * claim caps on each scaled row and on the total, and by what the inventory
 * can fill. Fewer units always fill when more do, since a subset of a full
 * allocation is still full, so the sizes are tried from the largest down.
 * When not even one unit fills, units is 0 and the allocation is one
 * unit's, which shows what's short.
 */
export function allocateUnits(
  wants: readonly TradeWant[],
  inventory: readonly InventoryObjekt[],
  pool: { free: number; unitSize: number },
) {
  const cap = Math.min(
    Math.floor(pool.free / pool.unitSize),
    Math.floor(
      MAX_TOTAL_WANTED / wants.reduce((sum, want) => sum + want.count, 0),
    ),
    ...wants.map((want) => Math.floor(MAX_PER_ROW / want.count)),
  );
  for (let units = cap; units > 1; units--) {
    const allocation = allocate(scaleWants(wants, units), inventory);
    if (isFullyAllocated(allocation)) return { units, allocation };
  }
  const allocation = allocate(wants, inventory);
  return {
    units: cap >= 1 && isFullyAllocated(allocation) ? 1 : 0,
    allocation,
  };
}
