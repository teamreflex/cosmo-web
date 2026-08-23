import type { CosmoMemberBFF } from "@apollo/cosmo/types/artists";
import { describe, expect, it } from "bun:test";
import {
  resolveCandidateColor,
  resolveCandidateColors,
} from "../src/lib/client/gravity/colors";

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
