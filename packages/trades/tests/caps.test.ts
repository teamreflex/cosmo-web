import { describe, expect, test } from "bun:test";
import { CLAIM_CAP_CEILING, claimCap } from "../src/caps";

describe("claimCap", () => {
  test("lets a new account hold 3 claims (CAP-01)", () => {
    expect(claimCap({ score: 0 })).toBe(3);
  });

  test("rises with the first positive rating (CAP-02)", () => {
    expect(claimCap({ score: 1 })).toBe(4);
  });

  test("stops at the ceiling of 8 (CAP-04)", () => {
    expect(claimCap({ score: 10_000 })).toBe(CLAIM_CAP_CEILING);
  });

  test("never drops below 3 for a negative score (CAP-05)", () => {
    expect(claimCap({ score: -50 })).toBe(3);
  });
});
