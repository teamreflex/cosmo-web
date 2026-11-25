import { describe, expect, test } from "bun:test";
import { type CosmoObjektMetadataV3, normalizeV3 } from "../src/types/metadata";

function metadata(
  className: string,
  members: string[],
  collectionNo: string,
): CosmoObjektMetadataV3 {
  return {
    name: `Divine02 ${members.at(-1)} ${collectionNo} #1`,
    description: "",
    image: "https://resources.cosmo.fans/images/collection-front-image/x.webp",
    background_color: "#FFD39F",
    attributes: [
      { trait_type: "Artist", value: "tripleS" },
      { trait_type: "Class", value: className },
      ...members.map((value) => ({ trait_type: "Member", value })),
      { trait_type: "Season", value: "Divine02" },
      { trait_type: "Collection", value: collectionNo },
    ],
  };
}

describe("normalizeV3 members", () => {
  test.each([
    [
      "Unit",
      metadata("Unit", ["Xinyu", "ChaeWon", "S15 x S21"], "601Z"),
      "S15 x S21",
      ["ChaeWon", "S15 x S21", "Xinyu"],
    ],
    [
      "Double with a second Member trait",
      metadata("Double", ["ChaeWon", "S21"], "325Z"),
      "S21",
      ["ChaeWon", "S21"],
    ],
    ["solo", metadata("First", ["Xinyu"], "101Z"), "Xinyu", ["Xinyu"]],
  ])("%s", (_, metadata, member, members) => {
    const { objekt } = normalizeV3(metadata, "1");
    expect(objekt.member).toBe(member);
    expect(objekt.members).toEqual([...members]);
  });
});
