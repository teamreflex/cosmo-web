import { describe, expect, test } from "bun:test";
import { offersSwap, swapTarget, togglePick } from "../src/picker";

describe("togglePick", () => {
  test("an unpicked copy joins a row with room", () => {
    expect(togglePick([[1], [2]], 0, 3, 2)).toEqual([[1, 3], [2]]);
  });

  test("a picked copy leaves its row", () => {
    expect(togglePick([[1, 3], [2]], 0, 1, 2)).toEqual([[3], [2]]);
  });

  test("in a full row an unpicked copy replaces the row's last pick", () => {
    expect(togglePick([[1, 3], [2]], 0, 4, 2)).toEqual([[1, 4], [2]]);
    expect(togglePick([[5], [2]], 0, 6, 1)).toEqual([[6], [2]]);
  });

  test("other rows and the input are left alone", () => {
    const picks = [[1], [2, 4]];
    expect(togglePick(picks, 1, 4, 2)).toEqual([[1], [2]]);
    expect(picks).toEqual([[1], [2, 4]]);
  });

  test("a row with no picks yet takes the copy", () => {
    expect(togglePick([[], []], 1, 9, 3)).toEqual([[], [9]]);
  });
});

describe("swapTarget", () => {
  test("a full row names the pick a tap would swap out", () => {
    expect(swapTarget([1, 3], 2)).toBe(3);
    expect(swapTarget([7], 1)).toBe(7);
  });

  test("a row with room swaps nothing", () => {
    expect(swapTarget([1], 2)).toBeNull();
    expect(swapTarget([], 1)).toBeNull();
  });
});

describe("offersSwap (the swap hint)", () => {
  test("a short row has nothing to swap in", () => {
    expect(offersSwap([1, 2, 3], 5)).toBe(false);
  });

  test("a row with exactly its count of copies has nothing to swap in", () => {
    expect(offersSwap([1, 2], 2)).toBe(false);
  });

  test("copies beyond the count can be swapped, duplicates or not", () => {
    expect(offersSwap([1, 2, 3], 2)).toBe(true);
    expect(offersSwap([1, 2, 3], 1)).toBe(true);
  });
});
