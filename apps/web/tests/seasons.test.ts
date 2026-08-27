import { describe, expect, it } from "bun:test";
import { seasonSort } from "../src/lib/universal/seasons";

describe("seasonSort", () => {
  it("sorts seasons newest-first following the season cycle", () => {
    // A cycle runs summer -> autumn -> winter -> spring, where winter and
    // spring carry the next calendar year's number. Summer26 begins a new
    // cycle and is therefore newer than Spring26.
    const seasons = [
      "Summer25",
      "Autumn25",
      "Summer26",
      "Winter26",
      "Spring26",
    ];

    expect(seasons.toSorted(seasonSort)).toEqual([
      "Summer26",
      "Spring26",
      "Winter26",
      "Autumn25",
      "Summer25",
    ]);
  });

  it("sorts older seasons by config order descending", () => {
    const seasons = ["Atom01", "Cream01", "Ever01", "Binary01", "Divine01"];

    expect(seasons.toSorted(seasonSort)).toEqual([
      "Ever01",
      "Divine01",
      "Cream01",
      "Binary01",
      "Atom01",
    ]);
  });
});
