import { describe, expect, test } from "bun:test";
import { allocate, isFullyAllocated } from "../src/allocate";
import { orderInventory } from "../src/inventory";
import { rangeFilterSchema } from "../src/range";
import { generateCase, type GeneratedObjekt, seeded } from "./generate";

/**
 * Copies of one collection with the given serials, ranked the way the
 * candidate query ranks them: serial desc, then token id.
 */
function copies(
  slug: string,
  member: string,
  tokens: readonly [tokenId: number, serial: number][],
): GeneratedObjekt[] {
  const ranked = tokens.toSorted(
    ([aId, aSerial], [bId, bSerial]) => bSerial - aSerial || aId - bId,
  );
  return ranked.map(([tokenId, serial], index) => ({
    tokenId,
    serial,
    rank: index + 1,
    owned: tokens.length,
    slug,
    artist: "artms",
    member,
    season: "Atom02",
    class: "First",
    onOffline: "online",
  }));
}

describe("orderInventory", () => {
  test("spends a duplicate before a collection's only copy (ALC-01)", () => {
    const x = copies("atom02-heejin-101z", "HeeJin", [
      [1, 3],
      [2, 2],
      [3, 1],
    ]);
    // Y's only copy has the highest serial of all
    const y = copies("atom02-kimlip-101z", "KimLip", [[4, 900]]);
    const ordered = orderInventory([...y, ...x]);

    expect(ordered.map(({ tokenId }) => tokenId)).toEqual([1, 2, 4, 3]);

    const want = rangeFilterSchema.parse({ season: ["Atom02"] });
    expect(
      allocate([{ kind: "range", filter: want, count: 1 }], ordered),
    ).toEqual([{ tokenIds: [1], missing: 0 }]);
  });

  test("gives the highest serial first, ties broken by token id (ALC-02)", () => {
    const x = copies("atom02-heejin-101z", "HeeJin", [
      [10, 5],
      [11, 900],
      [12, 120],
    ]);
    const ordered = orderInventory(x);
    expect(ordered.map(({ serial }) => serial)).toEqual([900, 120, 5]);
    expect(
      allocate(
        [{ kind: "exact", slug: "atom02-heejin-101z", count: 1 }],
        ordered,
      ),
    ).toEqual([{ tokenIds: [11], missing: 0 }]);

    const tied = copies("atom02-heejin-101z", "HeeJin", [
      [21, 7],
      [20, 7],
      [22, 7],
    ]);
    expect(orderInventory(tied).map(({ tokenId }) => tokenId)).toEqual([
      20, 21, 22,
    ]);
    expect(
      allocate(
        [{ kind: "exact", slug: "atom02-heejin-101z", count: 1 }],
        orderInventory(tied),
      ),
    ).toEqual([{ tokenIds: [20], missing: 0 }]);
  });

  test("keeps every keeper after every spare", () => {
    const ordered = orderInventory([
      ...copies("a", "HeeJin", [
        [1, 1],
        [2, 50],
      ]),
      ...copies("b", "KimLip", [
        [3, 99],
        [4, 2],
      ]),
    ]);
    expect(
      ordered.map(({ tokenId, rank, owned }) => [tokenId, rank < owned]),
    ).toEqual([
      [3, true],
      [2, true],
      [4, false],
      [1, false],
    ]);
  });

  test("leaves its input untouched", () => {
    const x = copies("a", "HeeJin", [
      [1, 1],
      [2, 50],
    ]);
    const before = x.map(({ tokenId }) => tokenId);
    orderInventory(x);
    expect(x.map(({ tokenId }) => tokenId)).toEqual(before);
  });
});

describe("capping copies per collection (ALC-03)", () => {
  test("never changes the allocation's outcome", () => {
    const random = seeded(8);
    let capped = 0;
    for (let run = 0; run < 3000; run++) {
      const { wants, inventory } = generateCase(random);
      const n = wants.reduce((sum, want) => sum + want.count, 0);
      const full = allocate(wants, orderInventory(inventory));
      const cappedInventory = inventory.filter(({ rank }) => rank <= n);
      if (cappedInventory.length < inventory.length) capped++;
      const bounded = allocate(wants, orderInventory(cappedInventory));

      expect(isFullyAllocated(bounded)).toBe(isFullyAllocated(full));
      expect(bounded.map(({ missing }) => missing)).toEqual(
        full.map(({ missing }) => missing),
      );
    }
    // the cap has to bite often enough for the property to mean something
    expect(capped).toBeGreaterThan(300);
  });
});
