import { describe, expect, test } from "bun:test";
import {
  deletionProofRefusal,
  deletionStep,
  FRESH_SESSION_MINUTES,
  isFreshSession,
} from "../src/lib/universal/account-deletion";
import type { DeletionStep } from "../src/lib/universal/account-deletion";
import type { AccountErrorCode } from "../src/lib/universal/errors/accounts";

const now = new Date("2026-10-10T12:00:00Z");

function minutesAgo(minutes: number) {
  return new Date(now.getTime() - minutes * 60_000);
}

describe("isFreshSession", () => {
  test("is fresh when signed in a minute before the limit", () => {
    expect(isFreshSession(minutesAgo(FRESH_SESSION_MINUTES - 1), now)).toBe(
      true,
    );
  });

  test("is stale when signed in exactly at the limit", () => {
    expect(isFreshSession(minutesAgo(FRESH_SESSION_MINUTES), now)).toBe(false);
  });
});

describe("deletionStep", () => {
  test.each([
    ["a fresh", 0],
    ["a stale", 60],
  ])("sends an email to a real address on %s session", (_, minutes) => {
    expect(deletionStep("nites@example.com", minutesAgo(minutes), now)).toBe(
      "send-email",
    );
  });

  /**
   * X sign-ins without a confirmed email store the X username as the email.
   */
  test("deletes straight away without an email on a fresh session", () => {
    expect(deletionStep("nites", minutesAgo(1), now)).toBe("delete");
  });

  test("asks to sign in again without an email on a stale session", () => {
    expect(deletionStep("nites", minutesAgo(60), now)).toBe("sign-in-again");
  });
});

describe("deletionProofRefusal", () => {
  test("leaves an emailed token to be consumed", () => {
    expect(
      deletionProofRefusal({ kind: "email", token: "abc" }, "send-email"),
    ).toBe(null);
  });

  test.each([
    ["delete", null],
    ["send-email", "account_deletion_email_required"],
    ["sign-in-again", "account_deletion_session_stale"],
  ] satisfies [DeletionStep, AccountErrorCode | null][])(
    "answers a fresh session at %s with %p",
    (step, refusal) => {
      expect(deletionProofRefusal({ kind: "fresh-session" }, step)).toBe(
        refusal,
      );
    },
  );
});
