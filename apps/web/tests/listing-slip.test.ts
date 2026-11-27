import type { ListingPayment } from "@apollo/trades/payment";
import type { ObjektAttributes, RangeFilter } from "@apollo/trades/range";
import { describe, expect, test } from "bun:test";
import {
  askingCards,
  askingFullLines,
  askingLines,
  collectionChips,
  itemLines,
  offeringLines,
  rangeChips,
  slipHides,
} from "../src/lib/universal/listing-slip";
import type {
  ListingFeedItem,
  ListingFeedWant,
} from "../src/lib/universal/trade-listings";

const attributes = (member: string, number: string): ObjektAttributes => ({
  slug: `atom02-${member.toLowerCase()}-${number.toLowerCase()}`,
  artist: "artms",
  member,
  season: "Atom02",
  class: "First",
  onOffline: "online",
});

const item = (tokenId: number, member: string, number: string) =>
  ({
    tokenId,
    serial: tokenId,
    attributes: attributes(member, number),
    collection: null,
  }) satisfies ListingFeedItem;

const range = (filter: Partial<RangeFilter>): RangeFilter => ({
  artist: [],
  member: [],
  collectionNo: [],
  season: [],
  class: [],
  on_offline: [],
  ...filter,
});

const exact = (count: number, member: string): ListingFeedWant => ({
  kind: "exact",
  count,
  objekt: attributes(member, "101Z"),
  collection: null,
});

const ranges = (count: number, filters: RangeFilter[]): ListingFeedWant => ({
  kind: "range",
  count,
  ranges: filters,
});

const payment: ListingPayment = {
  side: "to",
  currency: "USD",
  methods: [],
  mode: "price_only",
  amount: 300,
};

const kinds = (chips: { kind: string }[]) => chips.map((chip) => chip.kind);

describe("collectionChips", () => {
  test("a compact line folds copies and counts collections past two", () => {
    const chips = collectionChips(
      "items",
      [
        item(1, "KimLip", "102Z"),
        item(2, "KimLip", "102Z"),
        item(3, "HaSeul", "107Z"),
        item(4, "HaSeul", "108Z"),
      ],
      "compact",
    );
    expect(chips).toMatchObject([
      { kind: "collection", copies: 2, serial: null },
      { kind: "collection", copies: 1, serial: null },
      { kind: "more", count: 1 },
    ]);
  });

  test("a lone token keeps its serial on a compact line", () => {
    expect(
      collectionChips("items", [item(7, "KimLip", "102Z")], "compact"),
    ).toMatchObject([{ kind: "collection", serial: 7 }]);
  });

  test("a full line gives every token its own chip", () => {
    const chips = collectionChips(
      "items",
      [
        item(1, "KimLip", "102Z"),
        item(2, "KimLip", "102Z"),
        item(3, "HaSeul", "107Z"),
      ],
      "full",
    );
    expect(chips).toMatchObject([{ serial: 1 }, { serial: 2 }, { serial: 3 }]);
  });
});

describe("rangeChips", () => {
  const filter = range({
    artist: ["artms"],
    member: ["HaSeul", "HeeJin", "KimLip"],
    season: ["Atom01", "Binary01"],
    class: ["First", "Double"],
    collectionNo: ["101Z"],
  });

  test("a compact line sums up several values in a column", () => {
    expect(kinds(rangeChips("0", filter, "compact"))).toEqual([
      "artist",
      "member",
      "member",
      "more",
      "seasons",
      "value",
      "values",
    ]);
  });

  test("a full line names every value", () => {
    expect(kinds(rangeChips("0", filter, "full"))).toEqual([
      "artist",
      "member",
      "member",
      "member",
      "seasons",
      "seasons",
      "value",
      "value",
      "value",
    ]);
  });
});

describe("askingLines", () => {
  test("a range row's further ranges read as or, under its one count", () => {
    const lines = askingLines([
      {
        wants: [
          ranges(2, [
            range({ member: ["HaSeul"] }),
            range({ member: ["ChaeWon"] }),
          ]),
        ],
        payment: null,
      },
    ]);
    expect(lines).toMatchObject([
      { gutter: null, count: 2 },
      { gutter: { kind: "or" }, count: null },
    ]);
  });

  test("further rows and the claimer's payment join with and", () => {
    const lines = askingLines([
      { wants: [exact(1, "Xinyu"), exact(1, "Kaede")], payment },
    ]);
    expect(lines.map((line) => line.gutter)).toEqual([
      null,
      { kind: "and" },
      { kind: "and" },
    ]);
    expect(kinds(lines[2]?.chips ?? [])).toEqual(["payment"]);
  });

  test("each option is numbered on its first line", () => {
    const lines = askingLines([
      { wants: [exact(1, "Xinyu"), exact(1, "Kaede")], payment: null },
      { wants: [exact(1, "Nien")], payment: null },
    ]);
    expect(lines.map((line) => line.gutter)).toEqual([
      { kind: "option", number: 1 },
      { kind: "and" },
      { kind: "option", number: 2 },
    ]);
  });

  test("lines past three are counted on the last one shown", () => {
    const lines = askingLines([
      {
        wants: [exact(1, "Xinyu"), exact(1, "Kaede"), exact(1, "Nien")],
        payment: null,
      },
      { wants: [exact(1, "Yooyeon")], payment: null },
    ]);
    expect(lines).toHaveLength(3);
    expect(lines[2]?.chips.at(-1)).toMatchObject({ kind: "lines", count: 1 });
  });
});

describe("offeringLines", () => {
  test("a buy listing offers its price for each unit", () => {
    const lines = offeringLines(
      {
        items: [],
        options: [
          {
            wants: [exact(1, "KimLip")],
            payment: { ...payment, side: "from" },
          },
        ],
        units: { kind: "buy", maxUnits: 3, taken: 0 },
      },
      "compact",
    );
    expect(lines).toMatchObject([
      { gutter: null, chips: [{ kind: "payment", perUnit: true }] },
    ]);
  });

  test("the poster's payment on top follows their objekts with and", () => {
    const lines = offeringLines(
      {
        items: [item(1, "KimLip", "102Z")],
        options: [
          { wants: [exact(1, "Kaede")], payment: { ...payment, side: "from" } },
        ],
        units: { kind: "pool", unitSize: 1 },
      },
      "compact",
    );
    expect(lines.map((line) => line.gutter)).toEqual([null, { kind: "and" }]);
  });
});

test("askingCards takes the first three pictures across options", () => {
  const cards = askingCards([
    {
      wants: [
        {
          kind: "choice",
          count: 1,
          options: [
            { ...attributes("Kaede", "313Z"), collection: null },
            { ...attributes("Xinyu", "301A"), collection: null },
          ],
        },
      ],
      payment: null,
    },
    { wants: [ranges(1, [range({ member: ["Nien"] })])], payment: null },
    { wants: [exact(1, "Kaede")], payment: null },
  ]);
  expect(kinds(cards)).toEqual(["objekt", "objekt", "range"]);
});

describe("full lines", () => {
  test("an any of row gives each collection a line, or between them", () => {
    const lines = askingFullLines([
      {
        wants: [
          {
            kind: "choice",
            count: 2,
            options: [
              { ...attributes("Xinyu", "351A"), collection: null },
              { ...attributes("Xinyu", "352A"), collection: null },
            ],
          },
        ],
        payment: null,
      },
    ]);
    expect(lines).toMatchObject([
      { gutter: null, count: 2, chips: [{ kind: "collection" }] },
      { gutter: { kind: "or" }, count: null, chips: [{ kind: "collection" }] },
    ]);
  });

  test("offered tokens each get a line with their serial", () => {
    const lines = itemLines(
      [item(1, "HeeJin", "348Z"), item(2, "HeeJin", "348Z")],
      "full",
    );
    expect(lines.map((line) => line.chips)).toMatchObject([
      [{ serial: 1 }],
      [{ serial: 2 }],
    ]);
  });
});

describe("slipHides", () => {
  test("a row naming everything has nothing to expand", () => {
    expect(
      slipHides(
        askingLines([
          {
            wants: [ranges(1, [range({ season: ["Atom02"] })])],
            payment: null,
          },
        ]),
      ),
    ).toBe(false);
  });

  test("collections past two, or seasons summed up, are hidden", () => {
    expect(
      slipHides(
        offeringLines(
          {
            items: [
              item(1, "HeeJin", "347Z"),
              item(2, "HeeJin", "348Z"),
              item(3, "Xinyu", "364Z"),
            ],
            options: [{ wants: [exact(1, "Kaede")], payment: null }],
            units: { kind: "pool", unitSize: 1 },
          },
          "compact",
        ),
      ),
    ).toBe(true);
    expect(
      slipHides(
        askingLines([
          {
            wants: [ranges(1, [range({ season: ["Atom01", "Binary01"] })])],
            payment: null,
          },
        ]),
      ),
    ).toBe(true);
  });
});
