import { describe, expect, it } from "bun:test";
import type { Reveal } from "../src/lib/client/gravity/types";
import {
  findLatestBatch,
  sumComoPerCandidate,
  type RevealPage,
} from "../src/lib/client/gravity/reveals";

function reveal(candidateId: number, amount: number): Reveal {
  return {
    id: `${candidateId}-${amount}`,
    candidateId,
    amount,
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

function page(...votes: Reveal[]): RevealPage {
  return { votes };
}

describe("sumComoPerCandidate", () => {
  it("indexes COMO by candidate id", () => {
    const como = sumComoPerCandidate([
      reveal(0, 5),
      reveal(2, 3),
      reveal(0, 1),
    ]);

    expect(como).toEqual([6, 0, 3]);
  });

  it("returns nothing before any reveal", () => {
    expect(sumComoPerCandidate([])).toEqual([]);
  });
});

describe("findLatestBatch", () => {
  it("treats the first page as a baseline, not a batch", () => {
    expect(findLatestBatch([])).toBeNull();
    expect(findLatestBatch([page(reveal(0, 5))])).toBeNull();
  });

  it("has no deltas until a batch lands", () => {
    expect(findLatestBatch([page(reveal(0, 5)), page()])).toBeNull();
  });

  it("sums the batch that landed", () => {
    const batch = findLatestBatch([
      page(reveal(0, 100), reveal(1, 50)),
      page(reveal(1, 7), reveal(1, 3), reveal(3, 2)),
    ]);

    expect(batch).toEqual({
      comoPerCandidate: [0, 10, 0, 2],
      revealCount: 3,
    });
  });

  it("keeps the last batch through the empty pages after it", () => {
    const pages = [
      page(reveal(0, 100)),
      page(reveal(1, 9)),
      page(),
      page(),
      page(),
    ];

    expect(findLatestBatch(pages)?.comoPerCandidate).toEqual([0, 9]);
  });

  it("replaces the previous batch when a newer one lands", () => {
    const pages = [
      page(reveal(0, 100)),
      page(reveal(1, 9)),
      page(),
      page(reveal(2, 4)),
    ];

    expect(findLatestBatch(pages)?.comoPerCandidate).toEqual([0, 0, 4]);
  });
});
