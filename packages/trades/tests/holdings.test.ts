import { describe, expect, test } from "bun:test";
import {
  holdsAll,
  pickSerials,
  type SerialOwnership,
  type SerialPick,
  type TokenFlags,
} from "../src/holdings";

const ME = "0x000000000000000000000000000000000000000a";
const OTHER = "0x000000000000000000000000000000000000000b";
const X = "atom02-heejin-101z";
const Y = "atom02-kimlip-101z";

const noFlags: TokenFlags = { locked: new Set(), live: new Set() };

function found(
  tokenId: number,
  serial: number,
  options: { owner?: string; transferable?: boolean } = {},
): [number, SerialOwnership] {
  return [
    tokenId,
    {
      kind: "found",
      tokenId,
      serial,
      owner: options.owner ?? ME,
      transferable: options.transferable ?? true,
    },
  ];
}

describe("pickSerials (UNIT-10)", () => {
  // the best usable copy of X, which a refused named token falls back to
  const candidates = new Map<string, SerialPick[]>([
    [
      X,
      [
        { tokenId: 50, serial: 900 },
        { tokenId: 51, serial: 12 },
      ],
    ],
  ]);

  test("a usable named token wins over a higher-serial candidate", () => {
    expect(
      pickSerials(
        [X],
        new Map([[X, [10]]]),
        new Map([found(10, 3)]),
        ME,
        noFlags,
        candidates,
      ),
    ).toEqual({ [X]: { tokenId: 10, serial: 3 } });
  });

  test("the first usable named token wins, in entry order", () => {
    expect(
      pickSerials(
        [X],
        new Map([[X, [10, 11]]]),
        new Map([found(10, 3, { owner: OTHER }), found(11, 4)]),
        ME,
        noFlags,
        candidates,
      ),
    ).toEqual({ [X]: { tokenId: 11, serial: 4 } });
  });

  test.each<[string, Map<number, SerialOwnership>, TokenFlags]>([
    ["not_owned", new Map([found(10, 3, { owner: OTHER })]), noFlags],
    [
      "unknown to the indexer",
      new Map([[10, { kind: "missing", tokenId: 10 }]]),
      noFlags,
    ],
    ["missing from the states", new Map(), noFlags],
    [
      "untransferable",
      new Map([found(10, 3, { transferable: false })]),
      noFlags,
    ],
    [
      "locked",
      new Map([found(10, 3)]),
      { locked: new Set([10]), live: new Set() },
    ],
    [
      "live",
      new Map([found(10, 3)]),
      { locked: new Set(), live: new Set([10]) },
    ],
  ])(
    "a %s named token falls back to the best candidate",
    (_, states, flags) => {
      expect(
        pickSerials([X], new Map([[X, [10]]]), states, ME, flags, candidates),
      ).toEqual({ [X]: { tokenId: 50, serial: 900 } });
    },
  );

  test("with no named token, the highest-serial candidate is used", () => {
    expect(
      pickSerials([X], new Map(), new Map(), ME, noFlags, candidates),
    ).toEqual({ [X]: { tokenId: 50, serial: 900 } });
  });

  test("no usable named token and no candidate gives null", () => {
    expect(
      pickSerials(
        [X, Y],
        new Map([[X, [10]]]),
        new Map([found(10, 3, { owner: OTHER })]),
        ME,
        noFlags,
        new Map([[Y, []]]),
      ),
    ).toEqual({ [X]: null, [Y]: null });
  });

  test("two slugs sharing a candidate never get the same token", () => {
    expect(
      pickSerials(
        [X, Y],
        new Map(),
        new Map(),
        ME,
        noFlags,
        new Map([
          [X, [{ tokenId: 50, serial: 900 }]],
          [
            Y,
            [
              { tokenId: 50, serial: 900 },
              { tokenId: 60, serial: 7 },
            ],
          ],
        ]),
      ),
    ).toEqual({
      [X]: { tokenId: 50, serial: 900 },
      [Y]: { tokenId: 60, serial: 7 },
    });
  });

  test("a token named for two slugs is picked once", () => {
    expect(
      pickSerials(
        [X, Y],
        new Map([
          [X, [10]],
          [Y, [10]],
        ]),
        new Map([found(10, 3)]),
        ME,
        noFlags,
        new Map(),
      ),
    ).toEqual({ [X]: { tokenId: 10, serial: 3 }, [Y]: null });
  });

  test("a named token another slug's candidate took is skipped", () => {
    expect(
      pickSerials(
        [X, Y],
        new Map([[Y, [50, 11]]]),
        new Map([found(50, 900), found(11, 4)]),
        ME,
        noFlags,
        new Map([[X, [{ tokenId: 50, serial: 900 }]]]),
      ),
    ).toEqual({
      [X]: { tokenId: 50, serial: 900 },
      [Y]: { tokenId: 11, serial: 4 },
    });
  });

  test("the owner check ignores address case", () => {
    expect(
      pickSerials(
        [X],
        new Map([[X, [10]]]),
        new Map([found(10, 3)]),
        ME.toUpperCase().replace("0X", "0x"),
        noFlags,
        new Map(),
      ),
    ).toEqual({ [X]: { tokenId: 10, serial: 3 } });
  });
});

describe("holdsAll", () => {
  const states = new Map([found(1, 10), found(2, 20)]);

  test("holds every token it owns and can transfer, whatever the address's case", () => {
    expect(holdsAll([1, 2], states, ME.toUpperCase())).toBe(true);
  });

  test("a token gone elsewhere, untransferable or unknown breaks it", () => {
    expect(holdsAll([1], new Map([found(1, 10, { owner: OTHER })]), ME)).toBe(
      false,
    );
    expect(
      holdsAll([1], new Map([found(1, 10, { transferable: false })]), ME),
    ).toBe(false);
    expect(holdsAll([1, 3], states, ME)).toBe(false);
  });
});
