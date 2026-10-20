import { describe, expect, test } from "bun:test";
import {
  ImageFetchError,
  ImageProcessError,
  ImageStoreError,
  isSourceFailure,
} from "../src/errors";
import { normaliseSourceUrl, objektImageRef } from "../src/server";

const IMAGEDELIVERY =
  "https://imagedelivery.net/account/519a1d36-f906-4c8e-1aae-bb0e72be2700";

describe("normaliseSourceUrl", () => {
  test("rewrites imagedelivery variants to /original", () => {
    expect(normaliseSourceUrl(`${IMAGEDELIVERY}/3x`)).toBe(
      `${IMAGEDELIVERY}/original`,
    );
  });

  test("passes other hosts and non-URLs through", () => {
    const url =
      "https://resources.cosmo.fans/images/collection-front-image/2000/abc.webp";
    expect(normaliseSourceUrl(url)).toBe(url);
    expect(normaliseSourceUrl("")).toBe("");
  });
});

describe("objektImageRef", () => {
  test("hashes the normalised URL", () => {
    const fourX = objektImageRef("front", "slug", `${IMAGEDELIVERY}/4x`);
    const original = objektImageRef(
      "front",
      "slug",
      `${IMAGEDELIVERY}/original`,
    );
    expect(fourX.version).toMatch(/^[0-9a-f]{12}$/);
    expect(fourX).toEqual(original);
  });
});

describe("isSourceFailure", () => {
  test("splits source failures from infrastructure failures", () => {
    expect(
      isSourceFailure(
        new ImageFetchError({ url: "", status: 404, cause: null }),
      ),
    ).toBe(true);
    expect(
      isSourceFailure(new ImageProcessError({ url: "", cause: null })),
    ).toBe(true);
    expect(
      isSourceFailure(
        new ImageFetchError({ url: "", status: 503, cause: null }),
      ),
    ).toBe(false);
    expect(isSourceFailure(new ImageFetchError({ url: "", cause: null }))).toBe(
      false,
    );
    expect(
      isSourceFailure(
        new ImageStoreError({ key: "", status: 404, cause: null }),
      ),
    ).toBe(false);
  });
});
