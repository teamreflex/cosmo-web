import { describe, expect, it } from "bun:test";
import { estimateSerials, SERIAL_CUTOFF } from "../src";
import { hideSerials, loadFixture, serialsOf } from "./fixture";

describe("digital collections", () => {
  it("numbers a collection that started after the cutoff from #1", async () => {
    /**
     * Real serials read from the COSMO app for objekts minted after the
     * cutoff, so none of them were ever stored.
     */
    const confirmed: [string, [number, number][]][] = [
      [
        "atom02-heejin-104z",
        [
          [24962736, 1],
          [24962737, 2],
          [24963473, 80],
        ],
      ],
      [
        "atom02-jinsoul-106z",
        [
          [24973615, 1],
          [24974058, 50],
          [24974059, 51],
        ],
      ],
      [
        "atom02-heejin-102z",
        [
          [24978091, 178],
          [25008915, 377],
          [26799354, 574],
        ],
      ],
      [
        "atom02-choerry-104z",
        [
          [24976401, 23],
          [24976402, 24],
          [27473255, 592],
        ],
      ],
      [
        "atom02-haseul-103z",
        [
          [24968216, 21],
          [27137586, 440],
          [28919711, 2990],
        ],
      ],
      [
        "atom02-heejin-348z",
        [
          [30072049, 130],
          [30090253, 1089],
        ],
      ],
    ];

    for (const [slug, pairs] of confirmed) {
      const fixture = await loadFixture(slug);
      const serials = serialsOf(estimateSerials(fixture.collection, new Map()));
      for (const [tokenId, serial] of pairs) {
        expect(serials.get(tokenId)).toBe(serial);
      }
    }
  });

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
    for (const [tokenId, serial] of truth) {
      expect(before.get(tokenId)).toBe(serial - 4);
    }

    const after = serialsOf(
      estimateSerials(collection, new Map([[21176660, 2505]])),
    );
    for (const [tokenId, serial] of truth) {
      expect(after.get(tokenId)).toBe(serial);
    }
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
});
