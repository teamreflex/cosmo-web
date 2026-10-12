import { describe, expect, test } from "bun:test";
import { sanitizeUuid } from "../src/lib/universal/parsers";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

describe("sanitizeUuid, the detail route's id parser (SCH-23)", () => {
  const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  test.each([
    ["a non-uuid", "not-a-uuid"],
    ["a number", "123"],
    ["null", "null"],
    ["an array of a uuid", `[${id}]`],
    ["an object", "{}"],
    ["an empty string", ""],
    ["a uuid behind leading text", ` ${id}`],
    ["a truncated uuid", id.slice(0, 35)],
  ])("refuses %s, so the loader throws notFound", (_, param) => {
    expect(sanitizeUuid(param)).toBeNull();
  });

  test.each([
    ["the lowercase uuid", id],
    ["an uppercase uuid", id.toUpperCase()],
    ["a uuid with markdown pasted on", `${id}**`],
    ["an uppercase uuid with a bracket pasted on", `${id.toUpperCase()})`],
  ])("reads %s as the lowercase id", (_, param) => {
    expect(sanitizeUuid(param)).toBe(id);
  });

  test("keeps the nil uuid, which the read then misses", () => {
    expect(sanitizeUuid(NIL_UUID)).toBe(NIL_UUID);
  });
});
