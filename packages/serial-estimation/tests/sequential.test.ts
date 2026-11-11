import { describe, expect, it } from "bun:test";
import { estimateSerials, SERIAL_CUTOFF } from "../src";
import { hideSerials, loadFixture, misses, serialsOf } from "./fixture";

describe("digital collections", () => {
  it("drifts low after serials COSMO assigned but never minted, until one is confirmed", async () => {
    /**
     * binary02-dahyun-102z skips #2501-#2504: token 21176126 is #2500 and the
     * collection's next token, 21176660, is #2505. Every real serial after
     * #2500 is hidden.
     */
    const fixture = await loadFixture("binary02-dahyun-102z");
    const { collection, truth } = hideSerials(
      fixture.collection,
      SERIAL_CUTOFF,
      (objekt) => objekt.tokenId > 21176126 && objekt.serial > 0,
    );

    const before = serialsOf(estimateSerials(collection, new Map()));
    expect(before.get(21176660)).toBe(2501);
    expect(misses(truth, before, -4)).toEqual([]);

    const after = serialsOf(
      estimateSerials(collection, new Map([[21176660, 2505]])),
    );
    expect(misses(truth, after)).toEqual([]);
  });

  it("leaves objekts minted before the cutoff alone", async () => {
    const fixture = await loadFixture("binary02-dahyun-102z");
    const updates = estimateSerials(fixture.collection, new Map());
    const before = new Set(
      fixture.collection.objekts
        .filter((objekt) => objekt.mintedAt <= SERIAL_CUTOFF)
        .map((objekt) => objekt.tokenId),
    );
    expect(updates.filter((update) => before.has(update.tokenId))).toEqual([]);
  });

  it("counts a claim block's whole width", async () => {
    /**
     * atom02-choerry-101z holds a 400-serial claim block from 2026-07-15,
     * with 70 of its ids claimed. Token 29273487 is #4616 in the COSMO app:
     * 4,216 objekts outside the block up to it, plus the block's 400.
     * Counting only the claims put it at #4286.
     */
    const fixture = await loadFixture("atom02-choerry-101z");
    const serials = serialsOf(estimateSerials(fixture.collection, new Map()));
    expect(serials.get(29273487)).toBe(4616);
    // below the block nothing moves
    expect(serials.get(24976406)).toBe(17);
    // a claim takes its place in the block
    expect(serials.get(27653656)).toBe(
      fixture.collection.objekts.filter((objekt) => objekt.tokenId < 27653653)
        .length +
        1 +
        (27653656 - 27653653),
    );

    const withoutBlock = serialsOf(
      estimateSerials(
        { ...fixture.collection, kind: "sequential", claimBlocks: [] },
        new Map(),
      ),
    );
    expect(withoutBlock.get(29273487)).toBe(4286);
  });
});
