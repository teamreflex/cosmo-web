import { S3Client } from "bun";
import { describe, expect, test } from "bun:test";
import {
  mirrorObjektImage,
  normaliseSourceUrl,
  objektImageRef,
} from "../src/server";
import { handle, requests, runTest } from "./test-client";

const bucket = new S3Client({
  endpoint: "https://r2.test",
  bucket: "objekts-test",
  accessKeyId: "test",
  secretAccessKey: "test",
});

const IMAGEDELIVERY =
  "https://imagedelivery.net/account/519a1d36-f906-4c8e-1aae-bb0e72be2700";
const SOURCE = `${IMAGEDELIVERY}/4x`;

/**
 * A 2×3 PNG, small enough to encode every size quickly.
 */
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAEUlEQVR4nGP4z8DwnwGMERQARNAF+7BYSawAAAAASUVORK5CYII=",
  "base64",
);

/**
 * R2 object URL for a key, matching Bun's path-style presigned URLs.
 */
const objectUrl = (key: string) => `https://r2.test/objekts-test/${key}`;

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

describe("mirrorObjektImage", () => {
  const ref = objektImageRef("front", "atom01-seoyeon-101z", SOURCE);
  const prefix = `objekts/front/atom01-seoyeon-101z/${ref.version}`;

  test("skips everything when the marker exists", async () => {
    handle("HEAD", objectUrl(`${prefix}/xs.webp`), () => new Response(null));

    const version = await runTest(
      mirrorObjektImage(bucket, {
        side: "front",
        slug: ref.slug,
        sourceUrl: SOURCE,
      }),
    );

    expect(version).toBe(ref.version);
    expect(requests.map((r) => r.method)).toEqual(["HEAD"]);
  });

  test("downloads /original and writes the marker last", async () => {
    handle(
      "HEAD",
      objectUrl(`${prefix}/xs.webp`),
      () => new Response(null, { status: 404 }),
    );
    handle("GET", `${IMAGEDELIVERY}/original`, () => new Response(png));
    for (const name of [
      "raw.png",
      "original.webp",
      "grid.webp",
      "thumbnail.webp",
      "xs.webp",
    ]) {
      handle("PUT", objectUrl(`${prefix}/${name}`), () => new Response(null));
    }

    await runTest(
      mirrorObjektImage(bucket, {
        side: "front",
        slug: ref.slug,
        sourceUrl: SOURCE,
      }),
    );

    const puts = requests.filter((r) => r.method === "PUT");
    expect(puts.map((r) => r.url.pathname.split("/").at(-1))).toEqual([
      "raw.png",
      "original.webp",
      "grid.webp",
      "thumbnail.webp",
      "xs.webp",
    ]);
    expect(puts.map((r) => r.contentType)).toEqual([
      "image/png",
      "image/webp",
      "image/webp",
      "image/webp",
      "image/webp",
    ]);
  });

  test("backs only write raw and original, and force skips the marker check", async () => {
    const back = objektImageRef("back", ref.slug, SOURCE);
    const backPrefix = `objekts/back/${ref.slug}/${back.version}`;
    handle("GET", `${IMAGEDELIVERY}/original`, () => new Response(png));
    handle("PUT", objectUrl(`${backPrefix}/raw.png`), () => new Response(null));
    handle(
      "PUT",
      objectUrl(`${backPrefix}/original.webp`),
      () => new Response(null),
    );

    await runTest(
      mirrorObjektImage(bucket, {
        side: "back",
        slug: ref.slug,
        sourceUrl: SOURCE,
        force: true,
      }),
    );

    expect(requests.map((r) => r.method)).toEqual(["GET", "PUT", "PUT"]);
  });

  test("fails with the download status", () => {
    handle(
      "HEAD",
      objectUrl(`${prefix}/xs.webp`),
      () => new Response(null, { status: 404 }),
    );
    handle(
      "GET",
      `${IMAGEDELIVERY}/original`,
      () => new Response(null, { status: 403 }),
    );

    expect(
      runTest(
        mirrorObjektImage(bucket, {
          side: "front",
          slug: ref.slug,
          sourceUrl: SOURCE,
        }),
      ),
    ).rejects.toMatchObject({ _tag: "ImageFetchError", status: 403 });
  });
});
