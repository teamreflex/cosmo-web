import { describe, expect, test } from "bun:test";
import {
  firstRefusal,
  pickSerials,
  type SerialOwnership,
  type SerialPick,
  type TokenFlags,
  tokenRefusals,
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

  test("a live named token falls back to the best candidate", () => {
    expect(
      pickSerials(
        [X],
        new Map([[X, [10]]]),
        new Map([found(10, 3)]),
        ME,
        { locked: new Set(), live: new Set([10]) },
        candidates,
      ),
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

describe("tokenRefusals and firstRefusal", () => {
  const states = new Map([
    found(1, 5),
    found(2, 6, { owner: OTHER }),
    found(3, 7, { transferable: false }),
    found(4, 8),
  ]);
  const flags: TokenFlags = { locked: new Set([4]), live: new Set() };

  test("names every refused token and why, in submitted order", () => {
    expect(tokenRefusals([4, 1, 2, 3, 9], { states, ...flags }, ME)).toEqual([
      { kind: "token_unavailable", tokenId: 4, reason: "locked" },
      { kind: "token_unavailable", tokenId: 2, reason: "not_owned" },
      { kind: "token_unavailable", tokenId: 3, reason: "untransferable" },
      // a token the states don't hold reads as missing
      { kind: "token_unavailable", tokenId: 9, reason: "not_owned" },
    ]);
  });

  test("the first refusal is the earliest submitted", () => {
    expect(firstRefusal([1, 3, 2], { states, ...flags }, ME)).toEqual({
      kind: "token_unavailable",
      tokenId: 3,
      reason: "untransferable",
    });
    expect(firstRefusal([1], { states, ...flags }, ME)).toBeNull();
  });
});
