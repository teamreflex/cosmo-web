import { describe, expect, it } from "bun:test";
import { collectionKind, estimateSerials, SERIAL_CUTOFF } from "../src";
import { hideSerials, loadFixture, misses, serialsOf } from "./fixture";

describe("physical collections and coupon sets", () => {
  it("counts an unscanned reservation once a serial inside the next one is confirmed", async () => {
    /**
     * winter26-eunsoo-201a's 200-id reservation 18940295-18940494 has no
     * scans, so chaining from earlier reservations misses it and everything
     * from reservation 18940496-18942495 on comes out 200 low.
     */
    const fixture = await loadFixture("winter26-eunsoo-201a");
    const { collection, truth } = hideSerials(
      fixture.collection,
      SERIAL_CUTOFF,
      (objekt) => objekt.tokenId >= 18940496 && objekt.serial > 0,
    );

    const before = serialsOf(estimateSerials(collection, new Map()));
    expect(misses(truth, before, -200)).toEqual([]);

    expect(truth.get(18942307)).toBe(14412);
    const after = serialsOf(
      estimateSerials(collection, new Map([[18942307, 14412]])),
    );
    expect(misses(truth, after)).toEqual([]);
  });

  it("numbers an objekt from its own chunk when an online mint splits the reservation", async () => {
    /**
     * ever01-jinsoul-301a holds #1-#500 at 17693934-17694433, then an online
     * mint takes 17694434 and #501 starts at 17694435. 17694431 sits between
     * #488 (17694421) and #507 (17694441), which disagree by one.
     */
    const fixture = await loadFixture("ever01-jinsoul-301a");
    const { collection } = hideSerials(
      fixture.collection,
      SERIAL_CUTOFF,
      (objekt) => objekt.tokenId === 17694431,
    );
    const serials = serialsOf(estimateSerials(collection, new Map()));

    expect(serials.get(17694431)).toBe(498);
    expect(serials.get(17694433)).toBe(500);
    expect(serials.get(17694448)).toBe(514);
  });

  it("treats a QR coupon set minted online as reserved", () => {
    expect(collectionKind("cream02-jiwoo-315z", "online")).toBe("reserved");
  });

  it("starts a collection with no known serials at its first scanned chunk", async () => {
    /**
     * binary02-yooyeon-333a's first reservation starts 100 ids before its #1
     * at 20660249, and nobody has scanned those ids.
     */
    const fixture = await loadFixture("binary02-yooyeon-333a");
    const { collection, truth } = hideSerials(
      fixture.collection,
      SERIAL_CUTOFF,
      (objekt) => objekt.serial > 0,
    );

    const serials = serialsOf(estimateSerials(collection, new Map()));
    expect(serials.get(20660249)).toBe(1);
    expect(misses(truth, serials)).toEqual([]);
  });

  it("splits a shared reservation on 50s", async () => {
    /**
     * binary02-xinyu-340a holds the first 350 ids of the reservation that
     * binary02-mayu-339a's #1 follows at 21348041, halfway into a 100-id chunk.
     */
    const fixture = await loadFixture("binary02-mayu-339a");
    const { collection, truth } = hideSerials(
      fixture.collection,
      SERIAL_CUTOFF,
      (objekt) => objekt.serial > 0,
    );

    const serials = serialsOf(estimateSerials(collection, new Map()));
    expect(serials.get(21348041)).toBe(1);
    expect(misses(truth, serials)).toEqual([]);
  });

  it("counts unscanned chunks between a collection's own in a shared reservation", async () => {
    /**
     * binary02-sohyun-333a shares its first reservation with
     * binary02-nien-333a, and one of its chunks there has no scans. Skipping
     * it put every later reservation 100 low.
     */
    const fixture = await loadFixture("binary02-sohyun-333a");
    const { collection, truth } = hideSerials(
      fixture.collection,
      SERIAL_CUTOFF,
      (objekt) => objekt.serial > 0,
    );

    const serials = serialsOf(estimateSerials(collection, new Map()));
    expect(misses(truth, serials)).toEqual([]);
  });
});
