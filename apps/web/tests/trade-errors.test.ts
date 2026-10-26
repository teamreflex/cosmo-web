import { describe, expect, test } from "bun:test";
import {
  ExpectedError,
  isExpectedError,
} from "../src/lib/universal/errors/expected";
import { expectedErrorSerializationAdapter } from "../src/lib/universal/errors/serialization";

/**
 * Sentry filtering and the claim dialog read the code and data off the
 * instance the client receives.
 */
describe("ExpectedError serialization", () => {
  const { toSerializable, fromSerializable } =
    expectedErrorSerializationAdapter;

  test("keeps the code and data across the server boundary", () => {
    const error = fromSerializable(
      toSerializable(
        new ExpectedError("claim_token_unavailable", {
          tokenId: 4021,
          reason: "live",
        }),
      ),
    );
    expect(error).toBeInstanceOf(ExpectedError);
    expect(isExpectedError(error)).toBe(true);
    expect(error.message).toBe("claim_token_unavailable");
    expect(error.data).toEqual({ tokenId: 4021, reason: "live" });
  });

  test("leaves an error without data without it", () => {
    const error = fromSerializable(
      toSerializable(new ExpectedError("already_claimed")),
    );
    expect(error.data).toBeUndefined();
  });
});
