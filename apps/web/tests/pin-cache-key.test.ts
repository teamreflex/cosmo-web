import { pinCacheKey } from "@apollo/util-server";
import { expect, test } from "bun:test";

/**
 * `$fetchPins` finds an account by the decoded identifier, case-insensitively,
 * so every spelling that finds it must land on the key the pin clears use.
 */
test("percent-encoded and re-cased spellings share the stored username's key", () => {
  const stored = pinCacheKey("Kyle");
  expect(pinCacheKey("kYLE")).toBe(stored);
  expect(pinCacheKey("%4Byle")).toBe(stored);
});
