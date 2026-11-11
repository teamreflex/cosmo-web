import { describe, expect, test } from "bun:test";
import {
  listingFeedFrontendSchema,
  normalizeFeedArtists,
  normalizeListingFeedFilters,
} from "../src/lib/universal/parsers";
import { listingFeedInputSchema } from "../src/lib/universal/schema/listing-feed";

/**
 * The search params a URL carries once the router has decoded it.
 */
function search(query: string) {
  return listingFeedFrontendSchema.parse(
    Object.fromEntries(new URLSearchParams(query)),
  );
}

describe("Listings feed search params", () => {
  test("invalid and oversized values fall back without throwing (FPS-02)", () => {
    const seasons = Array.from({ length: 13 }, (_, i) => `Season${i}`);
    const parsed = search(
      `type=bogus&season=${seasons.join(",")}&want_class=&want_on_offline=online,both&artist=nobody`,
    );
    expect(parsed.type).toBeUndefined();
    expect(parsed.season).toEqual(seasons.slice(0, 12));
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
  });

  test("overlong and odd values drop as documented (FPS-05)", () => {
    expect(search(`member=${"x".repeat(10_000)}`).member).toBeUndefined();
    expect(search("member=HeeJin,%00").member).toBeUndefined();
    expect(search("want_member=%E2%80%AEHeeJin").want_member).toBeUndefined();
    expect(search("class=Firstclass").class).toBeUndefined();
    expect(search(`season=${"s".repeat(32)}`).season).toEqual(["s".repeat(32)]);
  });

  test("the server fn input re-applies the limits without the URL (FPS-05)", () => {
    const refused = [
      { member: ["x".repeat(33)] },
      { class: ["Firstclass"] },
      { season: [""] },
      { member: ["\0"] },
      { member: ["‮HeeJin"] },
      { on_offline: ["both"] },
      { artist: ["nobody"] },
      { season: Array.from({ length: 13 }, (_, i) => `S${i}`) },
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

  test("navbar artists the feed doesn't know drop instead of failing (FPS-06)", () => {
    expect(
      normalizeFeedArtists(["tripleS", "newartist", "ARTMS", "artms"]),
    ).toEqual(["artms", "triples"]);
  });
});
