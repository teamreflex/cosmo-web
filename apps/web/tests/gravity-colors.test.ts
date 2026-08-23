import type { CosmoMemberBFF } from "@apollo/cosmo/types/artists";
import { describe, expect, it } from "bun:test";
import {
  rankColor,
  resolveCandidateColor,
  resolveCandidateColors,
  resolveChoiceStyles,
  resolveSlotColors,
} from "../src/lib/client/gravity/colors";
import { buildSlotModel } from "../src/lib/client/gravity/slots";
import { combinationPoll, singlePoll } from "./fixtures/gravity-polls";

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

  it("wraps the member list for polls with more candidates than members", () => {
    const result = resolveCandidateColors(artist, ["a", "b", "c", "d"]);

    expect(result.colors).toEqual(["#8fcfe7", "#ff5b31", "#3d25aa", "#8fcfe7"]);
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
    const styles = resolveChoiceStyles(artist, buildSlotModel(singlePoll));

    expect(styles.get(0)).toEqual({
      label: "Song A",
      color: "#8fcfe7",
      altColors: [],
    });
    // no candidate is a member, so the palette follows the member list by position
    expect(styles.get(2)).toEqual({
      label: "Song C",
      color: "#3d25aa",
      altColors: [],
    });
  });

  it("names a combination choice after every member it picks", () => {
    const styles = resolveChoiceStyles(
      tripleS,
      buildSlotModel(combinationPoll),
    );

    expect(styles.get(0)?.label).toBe("SeoYeon + HyeRin");
    expect(styles.get(5)?.label).toBe("JiWoo + HyeRin");
  });

  it("colors a combination choice by the member it picks in the first slot", () => {
    const styles = resolveChoiceStyles(
      tripleS,
      buildSlotModel(combinationPoll),
    );

    // candidate 3 is HyeRin in EVOLution and JiWoo in LOVElution
    expect(styles.get(3)?.color).toBe("#e5cbb6");
    // the other slots' colors remain available for line de-duplication
    expect(styles.get(3)?.altColors).toEqual(["#f2e5b7"]);
  });
});

describe("resolveSlotColors", () => {
  it("keeps a member's color across the slots they race in", () => {
    const model = buildSlotModel(combinationPoll);
    const colors = model.slots.map((slot) =>
      resolveSlotColors(tripleS, model, slot)("HyeRin"),
    );

    expect(colors).toEqual(["#e5cbb6", "#e5cbb6"]);
  });

  it("colors a single poll's candidates as one set", () => {
    const model = buildSlotModel(singlePoll);
    const [slot] = model.slots;
    const color = resolveSlotColors(artist, model, slot);

    expect(color("Song A")).toBe("#8fcfe7");
    expect(color("Song B")).toBe("#ff5b31");
  });

  it("falls back for a name the slot doesn't hold", () => {
    const model = buildSlotModel(singlePoll);
    const [slot] = model.slots;

    expect(resolveSlotColors(artist, model, slot)("Song Z")).toBe("#8fcfe7");
  });
});

describe("rankColor", () => {
  it("colors the podium", () => {
    expect(rankColor(1)).toBe("#f5b83d");
    expect(rankColor(2)).toBe("#c0c6d4");
    expect(rankColor(3)).toBe("#d08b5b");
  });

  it("leaves every other rank uncolored", () => {
    expect(rankColor(4)).toBeUndefined();
  });
});
