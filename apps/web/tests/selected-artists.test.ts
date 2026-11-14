import { expect, test } from "bun:test";
import { selectedArtistsSchema } from "../src/lib/universal/schema/cosmo";

test("an artist the app doesn't know drops from the selection without clearing it", () => {
  expect(selectedArtistsSchema.parse(["artms", "newgroup", "idntt"])).toEqual([
    "artms",
    "idntt",
  ]);
});
