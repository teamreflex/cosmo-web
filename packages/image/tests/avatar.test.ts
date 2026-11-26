import { describe, expect, test } from "bun:test";
import { avatarCropRect } from "../src/index";

// the smallest mirrored front image
const IMAGE = { width: 1083, height: 1673 };

describe("avatarCropRect", () => {
  test("scales x and size by the width and y by the height", () => {
    expect(avatarCropRect({ x: 0.25, y: 0.1, size: 0.5 }, IMAGE)).toEqual({
      left: 271,
      top: 167,
      width: 542,
      height: 542,
    });
  });

  test("pulls a square that rounds past the right edge back inside", () => {
    const rect = avatarCropRect({ x: 0.7505, y: 0, size: 0.25 }, IMAGE);
    expect(rect.left + rect.width).toBe(IMAGE.width);
  });

  test("pulls a square that rounds past the bottom edge back inside", () => {
    const rect = avatarCropRect({ x: 0, y: 0.84, size: 0.25 }, IMAGE);
    expect(rect.top + rect.height).toBe(IMAGE.height);
  });

  test("a full-width crop is the width squared, wherever y puts it", () => {
    expect(avatarCropRect({ x: 0, y: 1, size: 1 }, IMAGE)).toEqual({
      left: 0,
      top: IMAGE.height - IMAGE.width,
      width: IMAGE.width,
      height: IMAGE.width,
    });
  });
});
