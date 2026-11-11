import { describe, expect, test } from "bun:test";
import {
  type ArtistValues,
  type ComposerRange,
  rangeArtistUnused,
  setRangeArtists,
} from "../src/composer";

const values: ArtistValues = new Map([
  [
    "triples",
    {
      member: ["SeoYeon", "HyeRin", "JiWoo"],
      season: ["Atom01", "Binary01", "Cream01"],
      class: ["First", "Double", "Special"],
    },
  ],
  [
    "artms",
    {
      member: ["HeeJin", "HaSeul", "JinSoul"],
      season: ["Atom01", "Binary01"],
      class: ["First", "Special", "Premier"],
    },
  ],
]);

describe("setRangeArtists", () => {
  test("picking an artist from any keeps every other column", () => {
    const filter: ComposerRange = {
      artist: [],
      season: ["Atom01"],
      class: ["First"],
    };
    expect(setRangeArtists(filter, ["tripleS"], values)).toEqual({
      ...filter,
      artist: ["triples"],
    });
  });

  test("removing an artist drops its members and what no remaining artist has", () => {
    const filter = {
      artist: ["triples", "artms"],
      member: ["SeoYeon", "JinSoul"],
      season: ["Atom01", "Cream01"],
      class: ["First", "Double", "Premier"],
      on_offline: ["online"],
    };
    expect(setRangeArtists(filter, ["artms"], values)).toEqual({
      artist: ["artms"],
      member: ["JinSoul"],
      season: ["Atom01"],
      class: ["First", "Premier"],
      on_offline: ["online"],
    });
  });

  test("a value no artist is known to have stays", () => {
    const filter: ComposerRange = {
      artist: ["triples", "artms"],
      season: ["Divine01", "Cream01"],
    };
    expect(setRangeArtists(filter, ["artms"], values)).toEqual({
      artist: ["artms"],
      season: ["Divine01"],
      member: [],
      class: [],
    });
  });

  test("going back to any keeps every value", () => {
    const filter = {
      artist: ["triples", "artms"],
      member: ["SeoYeon", "JinSoul"],
      season: ["Cream01"],
    };
    expect(setRangeArtists(filter, [], values)).toEqual({
      ...filter,
      artist: [],
    });
  });

  test("the same artists in any order or casing change nothing", () => {
    const filter = { artist: ["triples", "artms"], member: ["SeoYeon"] };
    expect(setRangeArtists(filter, ["ARTMS", "tripleS"], values)).toBe(filter);
  });
});

describe("rangeArtistUnused", () => {
  const rosters = new Map(
    [...values].map(([artist, { member }]) => [artist, member]),
  );

  test("an artist none of the members belong to is unused", () => {
    expect(
      rangeArtistUnused(
        { artist: ["triples", "artms"], member: ["JinSoul"] },
        rosters,
      ),
    ).toBe(true);
    expect(
      rangeArtistUnused({ artist: ["artms"], member: ["SeoYeon"] }, rosters),
    ).toBe(true);
  });

  test("a member of each artist uses them all, in any casing of the artist", () => {
    expect(
      rangeArtistUnused(
        { artist: ["tripleS", "ARTMS"], member: ["JinSoul", "SeoYeon"] },
        rosters,
      ),
    ).toBe(false);
  });

  test("without members, or without artists, nothing is unused", () => {
    expect(
      rangeArtistUnused({ artist: ["triples", "artms"], member: [] }, rosters),
    ).toBe(false);
    expect(rangeArtistUnused({ member: ["JinSoul"] }, rosters)).toBe(false);
  });
});
