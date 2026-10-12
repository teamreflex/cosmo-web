import { describe, expect, test } from "bun:test";
import {
  countActiveListingFilters,
  listingFeedFrontendSchema,
  normalizeFeedArtists,
  normalizeListingFeedFilters,
} from "../src/lib/universal/parsers";
import {
  listingFeedInputSchema,
  listingFeedTotalInputSchema,
} from "../src/lib/universal/schema/listing-feed";
import { stringifySearch } from "../src/lib/universal/search-params";

/**
 * The search params a URL carries once the router has decoded it.
 */
function search(query: string) {
  return listingFeedFrontendSchema.parse(
    Object.fromEntries(new URLSearchParams(query)),
  );
}

describe("Listings feed search params", () => {
  test("both groups parse and unknown keys drop (FPS-01)", () => {
    const parsed = search(
      "season=Atom02,Binary01&member=HeeJin&want_member=KimLip&want_artist=TRIPLES&type=trade&sort=newest",
    );
    expect(parsed).toEqual({
      season: ["Atom02", "Binary01"],
      member: ["HeeJin"],
      want_member: ["KimLip"],
      want_artist: "tripleS",
      type: "trade",
    });
    expect(normalizeListingFeedFilters(parsed)).toEqual({
      filters: {
        offering: { season: ["Atom02", "Binary01"], member: ["HeeJin"] },
        lookingFor: { member: ["KimLip"], artist: ["triples"] },
      },
      type: "trade",
    });
  });

  test("invalid and oversized values fall back without throwing (FPS-02)", () => {
    const seasons = Array.from({ length: 13 }, (_, i) => `Season${i}`);
    const parsed = search(
      `type=bogus&season=${seasons.join(",")}&on_offline=both&want_class=&want_on_offline=online,both&artist=nobody`,
    );
    expect(parsed.type).toBeUndefined();
    expect(parsed.season).toEqual(seasons.slice(0, 12));
    expect(parsed.on_offline).toBeUndefined();
    expect(parsed.want_class).toEqual([]);
    expect(parsed.want_on_offline).toBeUndefined();
    expect(parsed.artist).toBeUndefined();
    expect(normalizeListingFeedFilters(parsed)).toEqual({
      filters: {
        offering: { season: seasons.slice(0, 12).toSorted() },
        lookingFor: {},
      },
      type: null,
    });
  });

  test("invalid values leave the URL instead of reading null (FPS-08)", () => {
    const parsed = search(
      "type=bogus&on_offline=both&member=HeeJin,%00&artist=nobody&want_class=Firstclass&want_artist=nobody&season=Atom02",
    );
    expect(parsed).toEqual({ season: ["Atom02"] });
    expect(stringifySearch(parsed)).toBe("?season=Atom02");
    // the type picker's All clears the key rather than writing it as null
    expect(stringifySearch({ ...search("type=trade"), type: undefined })).toBe(
      "",
    );
  });

  test("equal filters give equal query keys (FPS-03)", () => {
    const a = normalizeListingFeedFilters(
      search(
        "season=Binary01,Atom02&member=KimLip,HeeJin&want_season=Cream01,Atom01&artist=ARTMS",
      ),
    );
    const b = normalizeListingFeedFilters(
      search(
        "member=HeeJin,KimLip,HeeJin&season=Atom02,Binary01&want_season=Atom01,Cream01&artist=artms&class=&want_member=",
      ),
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.filters.offering.artist).toEqual(["artms"]);

    const empty = normalizeListingFeedFilters(
      search("season=&member=,,&want_class=&want_on_offline="),
    );
    const missing = normalizeListingFeedFilters(search(""));
    expect(JSON.stringify(empty)).toBe(JSON.stringify(missing));
    expect(missing).toEqual({
      filters: { offering: {}, lookingFor: {} },
      type: null,
    });
  });

  test("overlong, empty and odd values drop or split as documented (FPS-05)", () => {
    const long = "x".repeat(10_000);
    expect(search(`member=${long}`).member).toBeUndefined();
    expect(search(`want_member=${long}`).want_member).toBeUndefined();
    expect(search("season=,,,").season).toEqual([]);
    expect(search("want_member=%00").want_member).toBeUndefined();
    expect(search("member=HeeJin,%00").member).toBeUndefined();
    expect(search("want_member=%E2%80%AEHeeJin").want_member).toBeUndefined();
    // the router decodes before the comma split, so an encoded comma splits too
    expect(search("season=a%2Cb").season).toEqual(["a", "b"]);
    expect(search("class=Firstclass").class).toBeUndefined();
    expect(search(`season=${"s".repeat(32)}`).season).toEqual(["s".repeat(32)]);
  });

  test("the server fn input re-applies the limits without the URL (FPS-05)", () => {
    const refused = [
      { member: ["x".repeat(33)] },
      { class: ["Firstclass"] },
      { season: [""] },
      { member: ["\0"] },
      { member: ["\u202EHeeJin"] },
      { on_offline: ["both"] },
      { artist: ["nobody"] },
      { season: Array.from({ length: 13 }, (_, i) => `S${i}`) },
      { member: "HeeJin" },
      { slug: ["atom02-heejin-201z"] },
    ];
    for (const offering of refused) {
      const input = {
        filters: { offering, lookingFor: {} },
        type: null,
        artists: [],
      };
      expect(listingFeedInputSchema.safeParse(input).success).toBe(false);
    }
    expect(
      listingFeedInputSchema.parse({
        filters: {
          offering: { artist: ["TRIPLES", "ArTmS"] },
          lookingFor: {},
        },
        type: null,
        artists: ["tripleS", "IDNTT"],
      }),
    ).toEqual({
      filters: { offering: { artist: ["triples", "artms"] }, lookingFor: {} },
      type: null,
      artists: ["triples", "idntt"],
    });
  });

  test("the header's total takes the feed's filters without a cursor (FPS-07)", () => {
    const input = {
      filters: { offering: { member: ["HeeJin"] }, lookingFor: {} },
      type: null,
      artists: ["ARTMS"],
    };
    expect(listingFeedTotalInputSchema.parse(input)).toEqual({
      ...input,
      artists: ["artms"],
    });
    expect(
      listingFeedTotalInputSchema.safeParse({
        ...input,
        cursor: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      listingFeedTotalInputSchema.safeParse({
        ...input,
        filters: { offering: { member: ["\0"] }, lookingFor: {} },
      }).success,
    ).toBe(false);
  });

  test("navbar artists the feed doesn't know drop instead of failing (FPS-06)", () => {
    const artists = normalizeFeedArtists([
      "tripleS",
      "newartist",
      "ARTMS",
      "artms",
      "",
      "\0",
    ]);
    expect(artists).toEqual(["artms", "triples"]);
    expect(normalizeFeedArtists(["newartist"])).toEqual([]);
    expect(
      listingFeedInputSchema.safeParse({
        filters: { offering: {}, lookingFor: {} },
        type: null,
        artists,
      }).success,
    ).toBe(true);
  });

  test.each([
    ["", 0],
    ["type=trade", 0],
    ["season=Atom02", 1],
    ["season=Atom02,Binary01,Cream01", 1],
    ["season=Atom02&type=trade", 1],
    ["artist=artms&member=HeeJin,KimLip", 2],
    [
      "season=Atom02&member=HeeJin&class=First&on_offline=online&artist=artms",
      5,
    ],
    ["want_season=Atom02", 1],
    [
      "want_season=Atom02&want_member=HeeJin&want_class=First&want_on_offline=offline&want_artist=tripleS",
      5,
    ],
    ["season=Atom02&want_season=Atom02", 2],
    ["member=HeeJin&want_member=HeeJin&want_artist=artms&type=trade", 3],
    [
      "season=Atom02&member=HeeJin&class=First&on_offline=online&artist=artms&want_season=Binary01&want_member=KimLip&want_class=Double&want_on_offline=offline&want_artist=artms&type=trade",
      10,
    ],
  ])(
    "Filters (n) counts the narrowed columns on both sides, never the type: %p (FPS-04)",
    (query, expected) => {
      expect(countActiveListingFilters(search(query))).toBe(expected);
    },
  );

  test("empty, invalid and duplicate values don't add to Filters (n) (FPS-04)", () => {
    expect(countActiveListingFilters(search("season=,,&want_member="))).toBe(0);
    expect(
      countActiveListingFilters(
        search(
          "on_offline=both&artist=nobody&want_class=Firstclass&type=bogus",
        ),
      ),
    ).toBe(0);
    expect(
      countActiveListingFilters(
        search("member=HeeJin,HeeJin&want_member=HeeJin"),
      ),
    ).toBe(2);
    expect(countActiveListingFilters({})).toBe(0);
    expect(
      countActiveListingFilters({
        season: [],
        member: undefined,
        want_class: [],
        want_artist: undefined,
        type: "trade",
      }),
    ).toBe(0);
  });
});
