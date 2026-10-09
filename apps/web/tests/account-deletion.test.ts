import { describe, expect, test } from "bun:test";
import * as z from "zod";
import {
  deletionBlockerCount,
  toDeletionCheck,
  tombstoneEmail,
} from "../src/lib/universal/account-deletion";
import type { DeletionBlocker } from "../src/lib/universal/account-deletion";

const blocker = {
  kind: "live-trades",
  trades: [
    {
      id: "trade-1",
      kind: "trade",
      counterparty: "Nites",
      state: { kind: "disputed" },
    },
  ],
} satisfies DeletionBlocker;

describe("toDeletionCheck", () => {
  test.each([
    ["no checks", []],
    ["checks without blockers", [null, null]],
  ])("allows deletion with %s", (_, results) => {
    expect(toDeletionCheck(results)).toEqual({ status: "allowed" });
  });

  test("blocks deletion with exactly the blockers returned", () => {
    expect(toDeletionCheck([null, blocker, null])).toEqual({
      status: "blocked",
      blockers: [blocker],
    });
  });
});

describe("deletionBlockerCount", () => {
  test("counts every live trade across blockers", () => {
    const twoTrades = {
      kind: "live-trades",
      trades: [
        ...blocker.trades,
        {
          id: "trade-2",
          kind: "purchase",
          counterparty: null,
          state: { kind: "deadline", at: new Date(0) },
        },
      ],
    } satisfies DeletionBlocker;

    expect(deletionBlockerCount([])).toBe(0);
    expect(deletionBlockerCount([blocker, twoTrades])).toBe(3);
  });
});

describe("tombstoneEmail", () => {
  test("is unique per user", () => {
    expect(tombstoneEmail("abc")).toBe("deleted+abc@invalid");
  });

  /**
   * Better Auth checks sign-in, sign-up and email changes with z.email(), so
   * nobody can sign in with, register or move to a tombstone address.
   */
  test("is rejected by z.email()", () => {
    expect(z.email().safeParse(tombstoneEmail("abc")).success).toBe(false);
  });
});
