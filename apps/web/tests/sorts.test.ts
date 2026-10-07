import { describe, expect, it } from "bun:test";
import {
  collectionSorts,
  indexSorts,
  profileSorts,
  supportedSort,
} from "../src/lib/universal/sorts";

describe("sort presets", () => {
  it("offers serial, duplicate and mint sorts only where they apply", () => {
    for (const sort of ["serialAsc", "serialDesc", "duplicatesDesc"] as const) {
      expect(collectionSorts).not.toContain(sort);
      expect(indexSorts).not.toContain(sort);
    }
    for (const sort of ["mintsAsc", "mintsDesc"] as const) {
      expect(collectionSorts).not.toContain(sort);
      expect(indexSorts).toContain(sort);
    }
  });

  it("falls back to newest for an unsupported or missing sort", () => {
    expect(supportedSort("mintsAsc", indexSorts)).toBe("mintsAsc");
    expect(supportedSort("mintsAsc", collectionSorts)).toBe("newest");
    expect(supportedSort("duplicatesDesc", indexSorts)).toBe("newest");
    expect(supportedSort(null, profileSorts)).toBe("newest");
    expect(supportedSort(undefined, profileSorts)).toBe("newest");
  });
});
