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
    expect(normalizeListingFeedFilters(parsed).type).toBeNull();
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

  test("a value longer than its column drops the column (FPS-05)", () => {
    expect(search(`season=${"s".repeat(32)}`).season).toEqual(["s".repeat(32)]);
    expect(search(`season=${"s".repeat(33)}`).season).toBeUndefined();
  });

  test("the server fn input re-applies the limits without the URL (FPS-05)", () => {
    const refused = [
      { member: ["x".repeat(33)] },
      { member: ["\0"] },
      { artist: ["nobody"] },
      { season: Array.from({ length: 13 }, (_, i) => `S${i}`) },
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
        artists: [],
      }),
    ).toEqual({
      filters: { offering: { artist: ["triples", "artms"] }, lookingFor: {} },
      type: null,
      artists: [],
    });
  });

  test("navbar artists the feed doesn't know drop instead of failing (FPS-06)", () => {
    expect(
      normalizeFeedArtists(["tripleS", "newartist", "ARTMS", "artms"]),
    ).toEqual(["artms", "triples"]);
  });
});
