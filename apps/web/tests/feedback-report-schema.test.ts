import { isKnownEvent } from "@apollo/chat/items";
import { describe, expect, test } from "bun:test";
import { createReportSchema } from "../src/lib/universal/schema/reports";

const feedbackId = "0f9e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f";
// Better Auth user ids aren't uuids
const userId = "Xk2v9QpL4mNa7RtY1cBw3eHs";

describe("createReportSchema feedback variant (PARSE-08)", () => {
  test("refuses a user-only reason on a rating", () => {
    for (const reason of ["scam", "impersonation"]) {
      const result = createReportSchema.safeParse({
        targetType: "feedback",
        targetId: feedbackId,
        reason,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([
        ["reason"],
      ]);
    }
  });

  test("refuses a feedback-only reason on a user", () => {
    for (const reason of ["retaliation", "personal_info"]) {
      const result = createReportSchema.safeParse({
        targetType: "user",
        targetId: userId,
        reason,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([
        ["reason"],
      ]);
    }
  });

  test("refuses a rating id that isn't a uuid", () => {
    for (const targetId of [userId, "", "123", `${feedbackId}x`]) {
      const result = createReportSchema.safeParse({
        targetType: "feedback",
        targetId,
        reason: "retaliation",
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([
        ["targetId"],
      ]);
    }
  });

  test("still takes a user's non-uuid id", () => {
    expect(
      createReportSchema.safeParse({
        targetType: "user",
        targetId: userId,
        reason: "scam",
      }).success,
    ).toBe(true);
  });

  test("refuses targets reported elsewhere", () => {
    for (const targetType of ["message", "trade", "listing", "Feedback"]) {
      expect(
        createReportSchema.safeParse({
          targetType,
          targetId: feedbackId,
          reason: "other",
        }).success,
      ).toBe(false);
    }
  });

  test("trims the note, drops an empty one and strips unknown keys", () => {
    expect(
      createReportSchema.parse({
        targetType: "feedback",
        targetId: feedbackId,
        reason: "personal_info",
        note: "  posted my address  ",
        reporterId: userId,
      }),
    ).toEqual({
      targetType: "feedback",
      targetId: feedbackId,
      reason: "personal_info",
      note: "posted my address",
    });
    expect(
      createReportSchema.parse({
        targetType: "feedback",
        targetId: feedbackId,
        reason: "spam",
        note: "   ",
      }).note,
    ).toBeUndefined();
    expect(
      createReportSchema.safeParse({
        targetType: "feedback",
        targetId: feedbackId,
        reason: "spam",
        note: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

describe("feedback_removed event", () => {
  test("chat knows a removal from either side", () => {
    for (const side of ["from", "to"] as const) {
      expect(isKnownEvent({ type: "feedback_removed", side })).toBe(true);
    }
  });

  test("an event outside that shape stays unknown to chat", () => {
    expect(isKnownEvent({ type: "feedback_removed", side: "both" })).toBe(
      false,
    );
    expect(isKnownEvent({ type: "feedback_removed" })).toBe(false);
  });
});
