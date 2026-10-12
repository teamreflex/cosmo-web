import { describe, expect, test } from "bun:test";
import { MAX_PER_ROW, MAX_TOTAL_WANTED, MAX_WANT_ROWS } from "../src/caps";
import {
  type ComposerRange,
  addExactWant,
  canAddWant,
  canStep,
  setRangeArtist,
  stepCount,
  toStoredArtist,
  toUiArtist,
  totalWanted,
  wantSummaryParts,
} from "../src/composer";

type Want =
  | { kind: "exact"; slug: string; count: number }
  | { kind: "range"; filter: ComposerRange; count: number };

const exact = (slug: string, count = 1): Want => ({
  kind: "exact",
  slug,
  count,
});
const range = (count: number, filter: ComposerRange = {}): Want => ({
  kind: "range",
  filter: { season: ["Atom02"], ...filter },
  count,
});

describe("addExactWant (CMP-01)", () => {
  test("adding the same collection twice raises one row to 2", () => {
    const first = addExactWant<Want>([], "atom02-heejin-201z");
    expect(first).toEqual({
      wants: [{ kind: "exact", slug: "atom02-heejin-201z", count: 1 }],
      index: 0,
    });

    const second = addExactWant(first.wants, "atom02-heejin-201z");
    expect(second).toEqual({
      wants: [{ kind: "exact", slug: "atom02-heejin-201z", count: 2 }],
      index: 0,
    });
  });

  test("a different collection appends its own row after the others", () => {
    const wants = [range(5), exact("atom02-heejin-201z")];
    expect(addExactWant(wants, "atom02-kimlip-201z")).toEqual({
      wants: [...wants, exact("atom02-kimlip-201z")],
      index: 2,
    });
  });

  test("merges only into exact rows, not a range", () => {
    const wants = [range(2)];
    const added = addExactWant(wants, "atom02-heejin-201z");
    expect(added.wants).toHaveLength(2);
    expect(added.index).toBe(1);
  });

  test("the merged count stops at MAX_PER_ROW", () => {
    const wants = [exact("a", MAX_PER_ROW)];
    expect(addExactWant(wants, "a")).toEqual({
      wants: [exact("a", MAX_PER_ROW)],
      index: null,
    });
  });

  test("the merged count stops at the listing's total", () => {
    const wants = [exact("a", 5), range(MAX_TOTAL_WANTED - 5)];
    expect(addExactWant(wants, "a")).toEqual({ wants, index: null });
  });

  test("no new row past the row cap or the total cap", () => {
    const full = Array.from({ length: MAX_WANT_ROWS }, (_, i) =>
      exact(`slug-${i}`),
    );
    expect(addExactWant(full, "new")).toEqual({ wants: full, index: null });

    const atTotal = [range(MAX_PER_ROW), range(MAX_TOTAL_WANTED - MAX_PER_ROW)];
    expect(addExactWant(atTotal, "new")).toEqual({
      wants: atTotal,
      index: null,
    });
    expect(canAddWant(atTotal)).toBe(false);
    expect(canAddWant(full)).toBe(false);
    expect(canAddWant([exact("a")])).toBe(true);
  });

  test("leaves its input untouched", () => {
    const wants = [exact("a")];
    addExactWant(wants, "a");
    expect(wants).toEqual([exact("a")]);
  });
});

describe("setRangeArtist (CMP-02)", () => {
  const filter = {
    artist: ["artms"],
    member: ["HeeJin"],
    season: ["Atom02"],
    class: ["First"],
    on_offline: ["online"],
  } satisfies ComposerRange;

  test("a new artist clears member, season and class and keeps on/offline", () => {
    expect(setRangeArtist(filter, "idntt")).toEqual({
      artist: ["idntt"],
      member: [],
      season: [],
      class: [],
      on_offline: ["online"],
    });
  });

  test("any artist clears the artist too", () => {
    expect(setRangeArtist(filter, null)).toEqual({
      artist: [],
      member: [],
      season: [],
      class: [],
      on_offline: ["online"],
    });
  });

  test("the same artist in another casing changes nothing", () => {
    const triples = { ...filter, artist: ["tripleS"] };
    expect(setRangeArtist(triples, "triples")).toBe(triples);
    expect(setRangeArtist(filter, "ARTMS")).toBe(filter);
  });

  test("stores the artist lowercase", () => {
    expect(setRangeArtist<ComposerRange>({}, "tripleS").artist).toEqual([
      "triples",
    ]);
  });
});

describe("stepCount (CMP-03)", () => {
  test("decrementing at 1 stays 1", () => {
    const wants = [exact("a", 1)];
    expect(stepCount(wants, 0, -1)).toBe(1);
    expect(canStep(wants, 0, -1)).toBe(false);
  });

  test("incrementing at MAX_PER_ROW stays at the max", () => {
    const wants = [exact("a", MAX_PER_ROW)];
    expect(stepCount(wants, 0, 1)).toBe(MAX_PER_ROW);
    expect(canStep(wants, 0, 1)).toBe(false);
    expect(canStep(wants, 0, -1)).toBe(true);
  });

  test("the listing total disables plus on every row", () => {
    const wants = [exact("a", 10), range(MAX_TOTAL_WANTED - 10)];
    expect(totalWanted(wants)).toBe(MAX_TOTAL_WANTED);
    expect(stepCount(wants, 0, 1)).toBe(10);
    expect(stepCount(wants, 1, 1)).toBe(MAX_TOTAL_WANTED - 10);
    expect(canStep(wants, 0, 1)).toBe(false);
    expect(canStep(wants, 1, 1)).toBe(false);
    expect(canStep(wants, 0, -1)).toBe(true);
  });

  test("ordinary steps move by one", () => {
    const wants = [range(5)];
    expect(stepCount(wants, 0, 1)).toBe(6);
    expect(stepCount(wants, 0, -1)).toBe(4);
  });
});

describe("artist casing", () => {
  test("stored artists map to the pickers' ids and back", () => {
    expect(toUiArtist("triples")).toBe("tripleS");
    expect(toUiArtist("artms")).toBe("artms");
    expect(toUiArtist("TRIPLES")).toBe("tripleS");
    expect(toUiArtist("unknown")).toBeUndefined();
    expect(toStoredArtist("tripleS")).toBe("triples");
  });
});

describe("wantSummaryParts (CMP-05)", () => {
  const labels = {
    artist: (artist: string) =>
      ({ artms: "ARTMS", triples: "tripleS" })[artist] ?? artist,
    onOffline: (value: string) => (value === "online" ? "Digital" : "Physical"),
  };

  /**
   * The order the feed's and the listing page's chips use, so a range
   * reads the same in the composer as everywhere it's shown.
   */
  test("5× Atom02 · ARTMS · First", () => {
    expect(
      wantSummaryParts(
        {
          count: 5,
          filter: { season: ["Atom02"], class: ["First"], artist: ["artms"] },
        },
        labels,
      ),
    ).toEqual({ count: "5×", label: "Atom02\u00a0· ARTMS\u00a0· First" });
  });

  test("season, artist, member, class, then on/offline; several values join with a slash", () => {
    expect(
      wantSummaryParts(
        {
          count: 2,
          filter: {
            artist: ["triples"],
            member: ["SeoYeon", "HyeRin"],
            season: ["Atom01", "Binary01"],
            class: [],
            on_offline: ["offline"],
          },
        },
        labels,
      ),
    ).toEqual({
      count: "2×",
      label:
        "Atom01 / Binary01\u00a0· tripleS\u00a0· SeoYeon / HyeRin\u00a0· Physical",
    });
  });

  test("an empty range has no label", () => {
    expect(wantSummaryParts({ count: 1, filter: {} }, labels)).toEqual({
      count: "1×",
      label: "",
    });
  });

  test("totalWanted sums every row", () => {
    expect(totalWanted([exact("a", 1), range(5)])).toBe(6);
    expect(totalWanted([])).toBe(0);
  });
});
