import type { CosmoMemberBFF } from "@apollo/cosmo/types/artists";
import type { CosmoPollChoices } from "@apollo/cosmo/types/gravity";
import { describe, expect, it } from "bun:test";
import {
  rankColor,
  resolveCandidateColor,
  resolveCandidateColors,
  resolveChartLines,
  resolveChoiceStyles,
  resolveSlotColors,
} from "../src/lib/client/gravity/colors";
import { buildSlotModel } from "../src/lib/client/gravity/slots";
import {
  combinationPoll,
  singlePoll,
  unitPoll,
} from "./fixtures/gravity-polls";

function member(name: string, primaryColorHex: string): CosmoMemberBFF {
  return {
    id: 1,
    name,
    units: "",
    alias: name,
    profileImageUrl: "",
    backgroundImageUrl: "",
    order: 1,
    createdAt: "",
    updatedAt: "",
    mainObjektImageUrl: null,
    artistId: "artms",
    primaryColorHex,
  };
}

const artist = {
  artistMembers: [
    member("HeeJin", "#8fcfe7"),
    member("KimLip", "#ff5b31"),
    member("JinSoul", "#3d25aa"),
  ],
};

describe("resolveCandidateColors", () => {
  it("colors a member poll from the members themselves", () => {
    const result = resolveCandidateColors(artist, ["JinSoul", "heejin"]);

    expect(result.mode).toBe("member");
    expect(result.colors).toEqual(["#3d25aa", "#8fcfe7"]);
  });

  it("maps candidates onto the member list when any candidate isn't a member", () => {
    // KimLip at index 0 must get HeeJin's color: one non-member drops the whole poll to index mode
    const result = resolveCandidateColors(artist, ["KimLip", "Sooooo Bad"]);

    expect(result.mode).toBe("index");
    expect(result.colors).toEqual(["#8fcfe7", "#ff5b31"]);
  });

  it("hashes candidates past the end of the member list", () => {
    const result = resolveCandidateColors(artist, ["a", "b", "c", "d"]);

    // wrapping would hand candidate "d" HeeJin's color a second time
    expect(result.colors[3]).toMatch(/^#[0-9a-f]{6}$/);
    expect(result.colors[3]).not.toBe("#8fcfe7");
  });

  it("keeps the member colors for the candidates the list does cover", () => {
    const result = resolveCandidateColors(artist, ["a", "b", "c", "d"]);

    expect(result.colors.slice(0, 3)).toEqual([
      "#8fcfe7",
      "#ff5b31",
      "#3d25aa",
    ]);
  });

  it("falls back to a stable hashed color without an artist", () => {
    const first = resolveCandidateColors(undefined, ["Song A", "Song B"]);
    const second = resolveCandidateColors(undefined, ["Song A", "Song B"]);

    expect(first.colors[0]).toMatch(/^#[0-9a-f]{6}$/);
    expect(first.colors).toEqual(second.colors);
    expect(first.colors[0]).not.toBe(first.colors[1]);
  });

  it("falls back to a hashed color for a member without one", () => {
    const colorless = { artistMembers: [member("Choerry", "")] };
    const result = resolveCandidateColors(colorless, ["Choerry"]);

    expect(result.colors[0]).toMatch(/^#[0-9a-f]{6}$/);
    expect(result.color(0)).toBe(
      resolveCandidateColor(colorless, "Choerry", 0),
    );
  });
});

describe("resolveCandidateColor", () => {
  it("gives a member the same color regardless of slot position", () => {
    expect(resolveCandidateColor(artist, "KimLip", 0)).toBe(
      resolveCandidateColor(artist, "KimLip", 4),
    );
  });

  it("maps non-members onto the member at that position", () => {
    expect(resolveCandidateColor(artist, "Sooooo Bad", 1)).toBe("#ff5b31");
  });
});

const tripleS = {
  artistMembers: [
    member("SeoYeon", "#c1e2ec"),
    member("HyeRin", "#e5cbb6"),
    member("JiWoo", "#f2e5b7"),
  ],
};

describe("resolveChoiceStyles", () => {
  it("names and colors a single poll's choices by candidate", () => {
    const styles = resolveChoiceStyles(
      artist,
      buildSlotModel(singlePoll, []),
      singlePoll,
    );

    expect(styles.get(0)).toEqual({
      label: "Song A",
      color: "#8fcfe7",
      imageUrl: "https://static.cosmo.fans/song-a.png",
    });
    // no candidate is a member, so the palette follows the member list by position
    expect(styles.get(2)).toEqual({
      label: "Song C",
      color: "#3d25aa",
      imageUrl: "https://static.cosmo.fans/song-c.png",
    });
  });

  it("names a combination choice after every member it picks", () => {
    const styles = resolveChoiceStyles(
      tripleS,
      buildSlotModel(combinationPoll, []),
      combinationPoll,
    );

    expect(styles.get(0)?.label).toBe("SeoYeon + HyeRin");
    expect(styles.get(5)?.label).toBe("JiWoo + HyeRin");
  });

  it("colors a combination choice by the member it picks in the first slot", () => {
    const styles = resolveChoiceStyles(
      tripleS,
      buildSlotModel(combinationPoll, []),
      combinationPoll,
    );

    // candidate 3 is HyeRin in EVOLution and JiWoo in LOVElution
    expect(styles.get(3)?.color).toBe("#e5cbb6");
  });

  it("images a combination choice with the card COSMO ships for it", () => {
    const styles = resolveChoiceStyles(
      tripleS,
      buildSlotModel(combinationPoll, []),
      combinationPoll,
    );

    expect(styles.get(3)?.imageUrl).toBe("https://static.cosmo.fans/c4.png");
  });

  it("falls back to the first slot member when a choice has no card", () => {
    const poll = {
      ...combinationPoll,
      choices: combinationPoll.choices.map((choice, index) =>
        index === 0 ? { ...choice, txImageUrl: "" } : choice,
      ),
    } satisfies CosmoPollChoices;
    const styles = resolveChoiceStyles(tripleS, buildSlotModel(poll, []), poll);

    expect(styles.get(0)?.imageUrl).toBe(
      "https://static.cosmo.fans/round-s1.png",
    );
  });
});

describe("member aliases", () => {
  it("colors a candidate named by a member's alias", () => {
    const seoyeon = { ...member("SeoYeon", "#ff9ecd"), alias: "S1" };
    const withAliases = {
      artistMembers: [member("HeeJin", "#8fcfe7"), seoyeon],
    };

    // index 0 would give HeeJin's color, so the alias is what resolves this
    expect(resolveCandidateColor(withAliases, "S1", 0)).toBe("#ff9ecd");
  });
});

describe("resolveChartLines", () => {
  // the unit fixture pairs HeeJin, HaSeul and KimLip
  const unitArtist = {
    artistMembers: [
      member("HeeJin", "#8fcfe7"),
      member("HaSeul", "#b1e3ff"),
      member("KimLip", "#ff5b31"),
    ],
  };

  it("runs a unit pairing's line between its two members' colors", () => {
    const [lines] = resolveChartLines(
      unitArtist,
      buildSlotModel(unitPoll, unitArtist.artistMembers),
    );

    expect(lines?.map((line) => line.gradient)).toEqual([
      ["#8fcfe7", "#b1e3ff"],
      ["#8fcfe7", "#ff5b31"],
      ["#b1e3ff", "#ff5b31"],
    ]);
    // the solid color is the pairing's first member, not its palette position
    expect(lines?.[1]?.color).toBe("#8fcfe7");
  });

  it("leaves a single poll's lines without a gradient", () => {
    const [lines] = resolveChartLines(artist, buildSlotModel(singlePoll, []));

    expect(lines?.map((line) => line.gradient)).toEqual([null, null, null]);
  });

  it("names a single poll's lines after the candidate", () => {
    const lines = resolveChartLines(artist, buildSlotModel(singlePoll, []));

    expect(lines[0]?.map((line) => line.label)).toEqual([
      "Song A",
      "Song B",
      "Song C",
    ]);
    expect(lines[0]?.[0]?.color).toBe("#8fcfe7");
    expect(lines[0]?.[0]?.candidateIds).toEqual([0]);
  });

  it("names a combination poll's lines after the slot and the member", () => {
    const lines = resolveChartLines(
      tripleS,
      buildSlotModel(combinationPoll, []),
    );

    expect(lines.map((slot) => slot.length)).toEqual([3, 3]);
    expect(lines[0]?.map((line) => line.label)).toEqual([
      "EVOLution – SeoYeon",
      "EVOLution – HyeRin",
      "EVOLution – JiWoo",
    ]);
  });

  it("gives a line every choice placing its member in the slot", () => {
    const lines = resolveChartLines(
      tripleS,
      buildSlotModel(combinationPoll, []),
    );
    const hyerin = lines[1]?.[1];

    expect(hyerin?.label).toBe("LOVElution – HyeRin");
    // a member keeps their color in every slot they race in
    expect(hyerin?.color).toBe("#e5cbb6");
    expect(hyerin?.candidateIds).toEqual([0, 5]);
  });
});

describe("resolveSlotColors", () => {
  it("keeps a member's color across the slots they race in", () => {
    const model = buildSlotModel(combinationPoll, []);
    const colors = model.slots.map((slot) =>
      resolveSlotColors(tripleS, model, slot)("HyeRin"),
    );

    expect(colors).toEqual(["#e5cbb6", "#e5cbb6"]);
  });

  it("colors a single poll's candidates as one set", () => {
    const model = buildSlotModel(singlePoll, []);
    const [slot] = model.slots;
    const color = resolveSlotColors(artist, model, slot);

    expect(color("Song A")).toBe("#8fcfe7");
    expect(color("Song B")).toBe("#ff5b31");
  });

  it("falls back for a name the slot doesn't hold", () => {
    const model = buildSlotModel(singlePoll, []);
    const [slot] = model.slots;

    expect(resolveSlotColors(artist, model, slot)("Song Z")).toBe("#8fcfe7");
  });
});

describe("rankColor", () => {
  it("colors the podium", () => {
    expect(rankColor(1)).toBe("hsl(40 90% 60%)");
    expect(rankColor(2)).toBe("hsl(222 19% 79%)");
    expect(rankColor(3)).toBe("hsl(25 55% 59%)");
  });

  it("leaves every other rank uncolored", () => {
    expect(rankColor(4)).toBeUndefined();
  });
});
