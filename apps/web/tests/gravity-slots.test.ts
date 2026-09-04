import type { CosmoMemberBFF } from "@apollo/cosmo/types/artists";
import type { CosmoPollChoices } from "@apollo/cosmo/types/gravity";
import { describe, expect, it } from "bun:test";
import type { RevealBatch } from "../src/lib/client/gravity/reveals";
import {
  buildSlotModel,
  candidateLabel,
  rankSlots,
} from "../src/lib/client/gravity/slots";
import {
  combinationPoll,
  singlePoll,
  unitPoll,
} from "./fixtures/gravity-polls";

// candidate ids 0..5, see the fixture for the combination they encode
const como = [10, 20, 5, 1, 7, 3];
const pollTotal = 46;

function names(candidates: { name: string }[]) {
  return candidates.map((candidate) => candidate.name);
}

function member(name: string, alias: string): CosmoMemberBFF {
  return {
    id: 1,
    name,
    units: "",
    alias,
    profileImageUrl: "",
    backgroundImageUrl: "",
    order: 1,
    createdAt: "",
    updatedAt: "",
    mainObjektImageUrl: null,
    artistId: "idntt",
    primaryColorHex: "",
  };
}

describe("buildSlotModel", () => {
  it("splits a combination poll into its slots", () => {
    const model = buildSlotModel(combinationPoll, []);

    expect(model.kind).toBe("combination");
    expect(model.slots.map((slot) => slot.name)).toEqual([
      "EVOLution",
      "LOVElution",
    ]);
  });

  it("collects the candidate ids that place a member in a slot", () => {
    const model = buildSlotModel(combinationPoll, []);
    const [evolution, lovelution] = model.slots;

    // members are listed in COSMO's slot choice order, not order of first mention
    expect(names(evolution?.candidates ?? [])).toEqual([
      "SeoYeon",
      "HyeRin",
      "JiWoo",
    ]);
    expect(
      evolution?.candidates.map((candidate) => candidate.candidateIds),
    ).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
    expect(
      lovelution?.candidates.map((candidate) => candidate.candidateIds),
    ).toEqual([
      [2, 4],
      [0, 5],
      [1, 3],
    ]);
  });

  it("covers every candidate id exactly once per slot", () => {
    const model = buildSlotModel(combinationPoll, []);

    for (const slot of model.slots) {
      const ids = slot.candidates
        .flatMap((candidate) => candidate.candidateIds)
        .sort((a, b) => a - b);
      expect(ids).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it("gives a single poll one implicit slot of its candidates", () => {
    const model = buildSlotModel(singlePoll, []);
    const [slot] = model.slots;

    expect(model.kind).toBe("single");
    expect(model.slots).toHaveLength(1);
    expect(names(slot?.candidates ?? [])).toEqual([
      "Song A",
      "Song B",
      "Song C",
    ]);
    expect(slot?.candidates.map((candidate) => candidate.candidateIds)).toEqual(
      [[0], [1], [2]],
    );
  });

  it("races a unit poll's pairings in one implicit slot", () => {
    const model = buildSlotModel(unitPoll, []);
    const [slot] = model.slots;

    expect(model.kind).toBe("unit");
    expect(model.slots).toHaveLength(1);
    expect(names(slot?.candidates ?? [])).toEqual([
      "HeeJin·HaSeul",
      "HeeJin·KimLip",
      "HaSeul·KimLip",
    ]);
    expect(slot?.candidates.map((candidate) => candidate.candidateIds)).toEqual(
      [[0], [1], [2]],
    );
  });

  it("splits a unit poll's pairing into its members", () => {
    const [slot] = buildSlotModel(unitPoll, []).slots;

    expect(slot?.candidates[0]?.members).toEqual([
      {
        name: "HeeJin",
        imageUrl: "https://static.cosmo.fans/member-heejin.png",
      },
      {
        name: "HaSeul",
        imageUrl: "https://static.cosmo.fans/member-haseul.png",
      },
    ]);
  });

  it("names a pairing's members from the alias COSMO titles them by", () => {
    // idntt titles pairings by alias, and keys the member images the same way
    const aliased = {
      ...unitPoll,
      pollViewMetadata: {
        ...unitPoll.pollViewMetadata,
        selectedContent: [
          {
            choiceId: "id1·id2",
            content: {
              type: "image",
              imageUrl: "https://static.cosmo.fans/id1-id2.png",
              title: "id1·id2",
              description: "",
            },
          },
        ],
        memberImages: {
          id1: "https://static.cosmo.fans/member-id1.png",
          id2: "https://static.cosmo.fans/member-id2.png",
        },
      },
    } satisfies CosmoPollChoices;
    const [slot] = buildSlotModel(aliased, [
      member("DoHun", "id1"),
      member("HeeJu", "id2"),
    ]).slots;

    expect(slot?.candidates[0]?.members).toEqual([
      { name: "DoHun", imageUrl: "https://static.cosmo.fans/member-id1.png" },
      { name: "HeeJu", imageUrl: "https://static.cosmo.fans/member-id2.png" },
    ]);
    expect(slot?.candidates.map(candidateLabel)).toEqual(["DoHun + HeeJu"]);
  });

  it("reads a pairing as its members and everything else as its title", () => {
    const [unit] = buildSlotModel(unitPoll, []).slots;
    const [single] = buildSlotModel(singlePoll, []).slots;

    expect(unit?.candidates.map(candidateLabel)).toEqual([
      "HeeJin + HaSeul",
      "HeeJin + KimLip",
      "HaSeul + KimLip",
    ]);
    expect(single?.candidates.map(candidateLabel)).toEqual([
      "Song A",
      "Song B",
      "Song C",
    ]);
  });

  it("leaves a single poll's candidates without pairing members", () => {
    const [slot] = buildSlotModel(singlePoll, []).slots;

    expect(slot?.candidates.map((candidate) => candidate.members)).toEqual([
      [],
      [],
      [],
    ]);
  });

  it("refuses a combination poll whose metadata skips a choice", () => {
    const broken = {
      ...combinationPoll,
      pollViewMetadata: {
        ...combinationPoll.pollViewMetadata,
        choiceIdToSlotChoicesMapTable:
          combinationPoll.pollViewMetadata.choiceIdToSlotChoicesMapTable.slice(
            0,
            5,
          ),
      },
    };

    expect(() => buildSlotModel(broken, [])).toThrow("no slot mapping");
  });
});

describe("rankSlots", () => {
  const model = buildSlotModel(combinationPoll, []);

  it("sums each slot to the poll total", () => {
    const rankings = rankSlots(model, como, null);

    expect(rankings.map((ranking) => ranking.total)).toEqual([
      pollTotal,
      pollTotal,
    ]);
    for (const ranking of rankings) {
      const share = ranking.rows.reduce((sum, row) => sum + row.share, 0);
      expect(share).toBeCloseTo(1);
    }
  });

  it("orders rows by COMO and scales the bar against the leader", () => {
    const [evolution, lovelution] = rankSlots(model, como, null);

    expect(
      evolution?.rows.map((row) => [row.candidate.name, row.como, row.rank]),
    ).toEqual([
      ["SeoYeon", 30, 1],
      ["JiWoo", 10, 2],
      ["HyeRin", 6, 3],
    ]);
    expect(
      lovelution?.rows.map((row) => [row.candidate.name, row.como, row.rank]),
    ).toEqual([
      ["JiWoo", 21, 1],
      ["HyeRin", 13, 2],
      ["SeoYeon", 12, 3],
    ]);
    expect(evolution?.rows[0]?.leaderShare).toBe(1);
    expect(evolution?.rows[1]?.leaderShare).toBeCloseTo(10 / 30);
  });

  it("has no movement without a reveal batch", () => {
    const rankings = rankSlots(model, como, null);

    for (const ranking of rankings) {
      for (const row of ranking.rows) {
        expect(row.movement).toBeNull();
      }
    }
  });

  it("derives movement by subtracting the latest batch", () => {
    // 8 COMO for candidate 4 (JiWoo in EVOLution, SeoYeon in LOVElution)
    const batch: RevealBatch = {
      comoPerCandidate: [0, 0, 0, 0, 8, 0],
      revealCount: 1,
    };
    const [evolution, lovelution] = rankSlots(model, como, batch);

    // JiWoo overtakes HyeRin on the strength of that batch
    expect(
      evolution?.rows.map((row) => [row.candidate.name, row.movement]),
    ).toEqual([
      ["SeoYeon", { como: 0, rankChange: 0 }],
      ["JiWoo", { como: 8, rankChange: 1 }],
      ["HyeRin", { como: 0, rankChange: -1 }],
    ]);

    // the same batch moves nobody in the other slot
    expect(lovelution?.rows.map((row) => row.movement?.rankChange)).toEqual([
      0, 0, 0,
    ]);
  });

  it("keeps tied candidates still across a batch", () => {
    const tied = [5, 5, 5, 5, 5, 5];
    const batch: RevealBatch = {
      comoPerCandidate: [1, 1, 1, 1, 1, 1],
      revealCount: 6,
    };
    const [evolution] = rankSlots(
      buildSlotModel(combinationPoll, []),
      tied,
      batch,
    );

    expect(evolution?.rows.map((row) => row.movement?.rankChange)).toEqual([
      0, 0, 0,
    ]);
  });

  it("handles an unrevealed poll", () => {
    const [evolution] = rankSlots(model, [], null);

    expect(evolution?.total).toBe(0);
    expect(
      evolution?.rows.map((row) => [row.como, row.share, row.leaderShare]),
    ).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });
});
