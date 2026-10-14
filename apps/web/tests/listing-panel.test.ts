import { describe, expect, test } from "bun:test";
import type { Objekt } from "../src/lib/universal/objekt-conversion";
import {
  type ListingState,
  type ListingViewer,
  type PublicListingPanel,
  candidatePanel,
  pickerVersion,
  publicListingPanel,
} from "../src/lib/universal/trade-listings";

const deadlineAt = new Date("2026-10-13T00:00:00Z");
const endedAt = new Date("2026-10-10T00:00:00Z");

const closedStates = [
  { status: "filled", endedAt, counterparty: "jascend" },
  { status: "filled", endedAt, counterparty: null },
  { status: "withdrawn", endedAt },
  { status: "broken", endedAt },
  { status: "removed", endedAt },
  { status: "abandoned", endedAt },
] satisfies ListingState[];

const viewers = [
  ["signed out", null],
  ["the linked poster", { userId: "poster", linked: true }],
  ["the unlinked poster", { userId: "poster", linked: false }],
  ["a linked viewer", { userId: "viewer", linked: true }],
  ["an unlinked viewer", { userId: "viewer", linked: false }],
] as const;

const posters = [
  ["", { id: "poster" }],
  [" by a deleted poster", null],
] as const;

/**
 * What an open or claimed listing shows each viewer before the server is
 * asked, by poster. A deleted poster's listing has no poster to match, so
 * its former poster reads it like anyone else.
 */
const expected = {
  open: {
    "": {
      "signed out": "signed_out",
      "the linked poster": "poster_open",
      "the unlinked poster": "poster_open",
      "a linked viewer": "viewer",
      "an unlinked viewer": "unlinked",
    },
    " by a deleted poster": {
      "signed out": "signed_out",
      "the linked poster": "viewer",
      "the unlinked poster": "unlinked",
      "a linked viewer": "viewer",
      "an unlinked viewer": "unlinked",
    },
  },
  claimed: {
    "": {
      "signed out": "onlooker",
      "the linked poster": "viewer",
      "the unlinked poster": "viewer",
      "a linked viewer": "viewer",
      "an unlinked viewer": "viewer",
    },
    " by a deleted poster": {
      "signed out": "onlooker",
      "the linked poster": "viewer",
      "the unlinked poster": "viewer",
      "a linked viewer": "viewer",
      "an unlinked viewer": "viewer",
    },
  },
} satisfies Record<
  "open" | "claimed",
  Record<
    (typeof posters)[number][0],
    Record<(typeof viewers)[number][0], PublicListingPanel["kind"]>
  >
>;

describe("publicListingPanel", () => {
  const live = [
    { status: "open" },
    { status: "claimed", deadlineAt },
  ] satisfies ListingState[];

  for (const state of live) {
    for (const [suffix, poster] of posters) {
      for (const [name, viewer] of viewers) {
        test(`${state.status} listing${suffix}, ${name}`, () => {
          const kind = expected[state.status][suffix][name];
          expect(publicListingPanel({ state, poster }, viewer)).toEqual({
            kind,
          });
        });
      }
    }
  }

  for (const state of closedStates) {
    for (const [suffix, poster] of posters) {
      for (const [name, viewer] of viewers) {
        test(`${state.status} listing${suffix}, ${name}`, () => {
          expect(publicListingPanel({ state, poster }, viewer)).toEqual({
            kind: "closed",
            state,
          });
        });
      }
    }
  }
});

describe("candidatePanel", () => {
  test("the cap comes first, then the poster's side, then the picker", () => {
    const wants = [{ kind: "exact", count: 1, objekt: { slug: "a" } }] as const;
    const open = { wants, blocked: false };
    const claims = { active: 2, cap: 3 };
    expect(
      candidatePanel(
        { wants, blocked: true },
        { claims: { active: 3, cap: 3 }, ownAddress: true },
      ),
    ).toBe("cap");
    expect(
      candidatePanel({ wants, blocked: true }, { claims, ownAddress: false }),
    ).toBe("blocked");
    expect(candidatePanel(open, { claims, ownAddress: true })).toBe("blocked");
    expect(candidatePanel(open, { claims, ownAddress: false })).toBe("picker");
    expect(
      candidatePanel(
        { wants: [...wants, { kind: "payment" }], blocked: false },
        { claims: { active: 0, cap: 3 }, ownAddress: false },
      ),
    ).toBe("blocked");
  });
});

describe("pickerVersion (DUI-14)", () => {
  const attributes = {
    slug: "atom02-heejin-201z",
    artist: "artms",
    member: "HeeJin",
    season: "Atom02",
    class: "Special",
    onOffline: "online",
  };
  const collection = {
    id: "atom02-heejin-201z",
    artist: "artms",
    member: "HeeJin",
    season: "Atom02",
    class: "Special",
    collectionNo: "201Z",
    collectionId: "Atom02 HeeJin 201Z",
    frontImage: "",
    backImage: "",
    frontImageVersion: null,
    backImageVersion: null,
    backgroundColor: "#000000",
    textColor: "#ffffff",
    bandImageUrl: null,
    frontMedia: null,
    hasAudio: false,
    slug: "atom02-heejin-201z",
    artistName: "ARTMS",
    onOffline: "online",
  } satisfies Objekt.Collection;
  const viewer = (tokenIds: number[], owned = 3, updatedAt = endedAt) =>
    ({
      role: "candidate",
      updatedAt,
      rows: [
        {
          owned,
          missing: 0,
          picks: tokenIds.map((tokenId) => ({
            tokenId,
            serial: tokenId,
            attributes,
            collection,
          })),
        },
      ],
      claims: { active: 0, cap: 3 },
      ownAddress: false,
    }) satisfies ListingViewer;

  test("a refetch with the same answer keeps the viewer's picks", () => {
    expect(pickerVersion(viewer([1]))).toBe(pickerVersion(viewer([1])));
  });

  test("a prefilled copy that became unavailable starts the picks again", () => {
    expect(pickerVersion(viewer([2]))).not.toBe(pickerVersion(viewer([1])));
  });

  test("a change in what the viewer owns starts the picks again", () => {
    expect(pickerVersion(viewer([1], 2))).not.toBe(pickerVersion(viewer([1])));
  });

  test("new terms start the picks again", () => {
    expect(pickerVersion(viewer([1], 3, deadlineAt))).not.toBe(
      pickerVersion(viewer([1])),
    );
  });
});
