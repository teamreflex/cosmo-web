import { describe, expect, test } from "bun:test";
import { numberLegacyListCopies } from "../src/lib/universal/lists";

describe("numberLegacyListCopies", () => {
  test("numbers a copy 2 when its slug is free", () => {
    expect(numberLegacyListCopies([], [{ name: "WTT", slug: "wtt" }])).toEqual([
      { name: "WTT 2", slug: "wtt-2" },
    ]);
  });

  test("numbers legacy lists that share a slug apart", () => {
    expect(
      numberLegacyListCopies(
        [],
        [
          { name: "wtt", slug: "wtt" },
          { name: "WTT", slug: "WTT" },
        ],
      ),
    ).toEqual([
      { name: "wtt 2", slug: "wtt-2" },
      { name: "WTT 3", slug: "WTT-3" },
    ]);
  });

  test("skips slugs the user already has, ignoring case", () => {
    expect(
      numberLegacyListCopies(
        ["WTT-2", "wtt-3"],
        [{ name: "wtt", slug: "wtt" }],
      ),
    ).toEqual([{ name: "wtt 4", slug: "wtt-4" }]);
  });

  test("numbers slugs apart that only match once truncated", () => {
    const copies = numberLegacyListCopies(
      [],
      [
        { name: "a".repeat(24), slug: `${"a".repeat(23)}b` },
        { name: "a".repeat(24), slug: `${"a".repeat(23)}c` },
      ],
    );

    expect(copies).toEqual([
      { name: `${"a".repeat(22)} 2`, slug: `${"a".repeat(22)}-2` },
      { name: `${"a".repeat(22)} 3`, slug: `${"a".repeat(22)}-3` },
    ]);
  });

  test("keeps labels within 24 characters past copy 9", () => {
    const taken = Array.from(
      { length: 8 },
      (_, i) => `${"a".repeat(22)}-${i + 2}`,
    );
    const [copy] = numberLegacyListCopies(taken, [
      { name: "b".repeat(24), slug: "a".repeat(24) },
    ]);

    expect(copy).toEqual({
      name: `${"b".repeat(21)} 10`,
      slug: `${"a".repeat(21)}-10`,
    });
  });

  test("keeps the other fields of each list", () => {
    const entries = [{ collectionId: "atom01-jinsoul-101z" }];
    expect(
      numberLegacyListCopies([], [{ name: "a", slug: "a", entries }]),
    ).toEqual([{ name: "a 2", slug: "a-2", entries }]);
  });
});
