import { describe, expect, test } from "bun:test";
import { feedbackSearchSchema } from "../src/lib/universal/feedback";

describe("PARSE-09: feedback page search params", () => {
  test("no params read as all, the defaults the URL leaves out", () => {
    expect(feedbackSearchSchema.parse({})).toEqual({
      role: "all",
      rating: "all",
    });
  });

  test("valid values are kept", () => {
    expect(
      feedbackSearchSchema.parse({ role: "seller", rating: "negative" }),
    ).toEqual({ role: "seller", rating: "negative" });
  });

  test("unknown values fall back to all without throwing", () => {
    expect(feedbackSearchSchema.parse({ role: "bogus", rating: 5 })).toEqual({
      role: "all",
      rating: "all",
    });
    expect(feedbackSearchSchema.parse({ role: "bogus", rating: "5" })).toEqual({
      role: "all",
      rating: "all",
    });
    // one bad value doesn't take the good one with it
    expect(
      feedbackSearchSchema.parse({ role: "buyer", rating: "excellent" }),
    ).toEqual({ role: "buyer", rating: "all" });
    expect(
      feedbackSearchSchema.parse({ role: "Seller", rating: "positive" }),
    ).toEqual({ role: "all", rating: "positive" });
    expect(
      feedbackSearchSchema.parse({ role: ["seller"], rating: null }),
    ).toEqual({ role: "all", rating: "all" });
  });
});
