import type { RangeFilter } from "@apollo/trades/range";
import { describe, expect, test } from "bun:test";
import {
  type PickerFilters,
  initialPickerFilters,
  scopedPickerFilters,
  toCollectionFilters,
} from "../src/components/objekt-picker/picker-filters";
import { wantScope } from "../src/lib/client/trade-listings";
import type { ListingFeedWant } from "../src/lib/universal/trade-listings";

const exact: Extract<ListingFeedWant, { kind: "exact" }> = {
  kind: "exact",
  count: 1,
  objekt: {
    slug: "atom01-kimlip-207a",
    artist: "artms",
    member: "KimLip",
    season: "Atom01",
    class: "Double",
    onOffline: "offline",
  },
  collection: null,
};

const range = (
  filter: Partial<RangeFilter>,
): Extract<ListingFeedWant, { kind: "range" }> => ({
  kind: "range",
  count: 1,
  filter: {
    artist: [],
    member: [],
    season: [],
    class: [],
    on_offline: [],
    ...filter,
  },
});

describe("wantScope", () => {
  test("an exact row pins its collection", () => {
    expect(wantScope(exact)).toEqual({
      artist: ["artms"],
      member: ["KimLip"],
      season: ["Atom01"],
      class: ["Double"],
      onOffline: ["offline"],
      collectionNo: ["207A"],
    });
  });

  test("a range keeps its columns, with artists as the pickers name them", () => {
    expect(
      wantScope(
        range({
          artist: ["artms", "triples"],
          season: ["Atom01"],
          class: ["First", "Double"],
          on_offline: ["online"],
        }),
      ),
    ).toEqual({
      artist: ["artms", "tripleS"],
      member: [],
      season: ["Atom01"],
      class: ["First", "Double"],
      onOffline: ["online"],
      collectionNo: [],
    });
  });
});

describe("scopedPickerFilters", () => {
  test("an unscoped picker starts on every artist", () => {
    expect(scopedPickerFilters(null)).toEqual(initialPickerFilters);
  });

  test("a scope held to one artist starts on it", () => {
    expect(scopedPickerFilters(wantScope(exact)).artist).toBe("artms");
  });

  test("a scope open to any or several artists starts on all of them", () => {
    expect(scopedPickerFilters(wantScope(range({}))).artist).toBeNull();
    expect(
      scopedPickerFilters({
        ...wantScope(range({})),
        artist: ["artms", "tripleS"],
      }).artist,
    ).toBeNull();
  });
});

describe("toCollectionFilters", () => {
  const filters = (overrides: Partial<PickerFilters> = {}): PickerFilters => ({
    ...initialPickerFilters,
    ...overrides,
  });

  test("an unscoped picker sends only the viewer's filters", () => {
    expect(
      toCollectionFilters(filters({ member: ["HeeJin"], transferable: true })),
    ).toEqual({
      artist: undefined,
      member: ["HeeJin"],
      season: undefined,
      class: undefined,
      on_offline: undefined,
      collectionNo: undefined,
      transferable: true,
      sort: undefined,
    });
  });

  test("an exact row's scope sends its whole collection", () => {
    const scope = wantScope(exact);
    expect(toCollectionFilters(scopedPickerFilters(scope), scope)).toEqual({
      artist: "artms",
      member: ["KimLip"],
      season: ["Atom01"],
      class: ["Double"],
      on_offline: ["offline"],
      collectionNo: ["207A"],
      transferable: undefined,
      sort: undefined,
    });
  });

  test("a range's open columns stay open", () => {
    const scope = wantScope(range({ artist: ["artms"], season: ["Atom01"] }));
    expect(toCollectionFilters(scopedPickerFilters(scope), scope)).toEqual({
      artist: "artms",
      member: undefined,
      season: ["Atom01"],
      class: undefined,
      on_offline: undefined,
      collectionNo: undefined,
      transferable: undefined,
      sort: undefined,
    });
  });

  test("the viewer's filters narrow inside the scope", () => {
    const scope = wantScope(
      range({ season: ["Atom01", "Binary01"], class: ["First", "Double"] }),
    );
    expect(
      toCollectionFilters(
        filters({
          artist: "artms",
          season: ["Binary01"],
          member: ["HeeJin"],
          onOffline: "online",
          sort: "serialAsc",
        }),
        scope,
      ),
    ).toEqual({
      artist: "artms",
      member: ["HeeJin"],
      season: ["Binary01"],
      class: ["First", "Double"],
      on_offline: ["online"],
      collectionNo: undefined,
      transferable: undefined,
      sort: "serialAsc",
    });
  });
});
