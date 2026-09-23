import type { S3Client } from "bun";
import { Duration, Effect, Schedule } from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
} from "effect/unstable/http";
import { createHash } from "node:crypto";
import { ImageFetchError, ImageProcessError, ImageStoreError } from "./errors";
import {
  OBJEKT_IMAGE_WIDTHS,
  type ObjektImageName,
  type ObjektImageRef,
  type ObjektImageSide,
  objektImageKey,
  objektImagePrefix,
} from "./index";

/**
 * Quality of `original`. The untouched source is archived as `raw`, so this doesn't need to be lossless.
 */
const ORIGINAL_QUALITY = 90;
const RESIZED_QUALITY = 80;

/**
 * The last file written for each side. Writes across files aren't atomic,
 * so its presence means every earlier file was written too.
 */
const MARKER = {
  front: "xs",
  back: "original",
} satisfies Record<ObjektImageSide, ObjektImageName>;

const RAW_FORMATS = {
  jpeg: { extension: "jpg", contentType: "image/jpeg" },
  png: { extension: "png", contentType: "image/png" },
  webp: { extension: "webp", contentType: "image/webp" },
  heic: { extension: "heic", contentType: "image/heic" },
  avif: { extension: "avif", contentType: "image/avif" },
  bmp: { extension: "bmp", contentType: "image/bmp" },
  tiff: { extension: "tiff", contentType: "image/tiff" },
  gif: { extension: "gif", contentType: "image/gif" },
} satisfies Record<
  Bun.Image.Format,
  { extension: string; contentType: string }
>;

export type ObjektImageFile = {
  readonly key: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
};

/**
 * Cloudflare Images (imagedelivery.net) picks a resized variant from the last
 * path segment, and `/original` is the unresized upload. Every other host is
 * returned unchanged, as is anything that doesn't parse as a URL.
 */
export function normaliseSourceUrl(url: string) {
  const parsed = URL.parse(url);
  if (parsed?.hostname !== "imagedelivery.net") {
    return url;
  }

  parsed.pathname = parsed.pathname.replace(/[^/]+$/, "original");
  return parsed.toString();
}

/**
 * Build the ref for a COSMO source URL. The version is a truncated SHA-256 of
 * the normalised URL, so the indexer, the backfill and the admin tool all
 * derive the same key without coordinating.
 */
export function objektImageRef(
  side: ObjektImageSide,
  slug: string,
  sourceUrl: string,
): ObjektImageRef {
  const version = createHash("sha256")
    .update(normaliseSourceUrl(sourceUrl))
    .digest("hex")
    .slice(0, 12);
  return { side, slug, version };
}

export function objektImageMarkerKey(ref: ObjektImageRef) {
  return objektImageKey(ref, MARKER[ref.side]);
}

const withTimeout =
  (duration: Duration.Input) => (client: HttpClient.HttpClient) =>
    HttpClient.transform(client, (effect, request) =>
      Effect.timeoutOrElse(effect, {
        duration,
        orElse: () =>
          Effect.fail(
            new HttpClientError.HttpClientError({
              reason: new HttpClientError.TransportError({
                request,
                description: "request timed out",
              }),
            }),
          ),
      }),
    );

/**
 * 30s per attempt, retrying transport errors and transient statuses twice
 * with backoff. Callers decide which statuses count as success. R2 requests
 * go through presigned URLs on this client rather than `S3Client.write()`,
 * which takes no signal, so timeouts and interruption abort them.
 */
const imageClient = Effect.map(HttpClient.HttpClient, (client) =>
  client.pipe(
    withTimeout(Duration.seconds(30)),
    HttpClient.retryTransient({
      retryOn: "errors-and-responses",
      times: 2,
      schedule: Schedule.exponential("500 millis"),
    }),
  ),
);

/**
 * Download a source image. Leaves `Accept` unset: Cloudflare Images answers a
 * browser-style `Accept` with AVIF, which Bun.Image can't decode on Linux.
 */
export const fetchObjektImageSource = Effect.fn("Image.fetchSource")(function* (
  sourceUrl: string,
) {
  const url = normaliseSourceUrl(sourceUrl);
  const client = yield* imageClient;
  const response = yield* client
    .get(url)
    .pipe(
      Effect.mapError(
        (cause) =>
          new ImageFetchError({ url, status: cause.response?.status, cause }),
      ),
    );

  if (response.status !== 200) {
    return yield* new ImageFetchError({
      url,
      status: response.status,
      cause: null,
    });
  }

  const body = yield* response.arrayBuffer.pipe(
    Effect.mapError(
      (cause) => new ImageFetchError({ url, status: response.status, cause }),
    ),
  );

  return new Uint8Array(body);
});

/**
 * Produce every file for a ref, in write order: `raw`, `original`, then for
 * fronts `grid`, `thumbnail` and `xs`. The smaller sizes are derived from the
 * `grid` bytes so the full-size source is only decoded once for resizing.
 */
export const renderObjektImage = Effect.fn("Image.render")(function* (
  ref: ObjektImageRef,
  source: Uint8Array,
  sourceUrl: string,
) {
  const run = <A>(pipeline: () => Promise<A>) =>
    Effect.tryPromise({
      try: pipeline,
      catch: (cause) => new ImageProcessError({ url: sourceUrl, cause }),
    });

  const { format } = yield* run(() => new Bun.Image(source).metadata());
  const raw = RAW_FORMATS[format];
  const original =
    format === "webp"
      ? source
      : yield* run(() =>
          new Bun.Image(source).webp({ quality: ORIGINAL_QUALITY }).bytes(),
        );

  const files: ObjektImageFile[] = [
    {
      key: `${objektImagePrefix(ref)}/raw.${raw.extension}`,
      contentType: raw.contentType,
      bytes: source,
    },
    {
      key: objektImageKey(ref, "original"),
      contentType: "image/webp",
      bytes: original,
    },
  ];

  if (ref.side === "back") {
    return files;
  }

  const grid = yield* run(() =>
    new Bun.Image(source)
      .resize(OBJEKT_IMAGE_WIDTHS.grid, undefined, {
        withoutEnlargement: true,
      })
      .webp({ quality: RESIZED_QUALITY })
      .bytes(),
  );
  const resizeGrid = (width: number) =>
    run(() =>
      new Bun.Image(grid)
        .resize(width)
        .webp({ quality: RESIZED_QUALITY })
        .bytes(),
    );
  const { thumbnail, xs } = yield* Effect.all(
    {
      thumbnail: resizeGrid(OBJEKT_IMAGE_WIDTHS.thumbnail),
      xs: resizeGrid(OBJEKT_IMAGE_WIDTHS.xs),
    },
    { concurrency: 2 },
  );

  return [
    ...files,
    {
      key: objektImageKey(ref, "grid"),
      contentType: "image/webp",
      bytes: grid,
    },
    {
      key: objektImageKey(ref, "thumbnail"),
      contentType: "image/webp",
      bytes: thumbnail,
    },
    { key: objektImageKey(ref, "xs"), contentType: "image/webp", bytes: xs },
  ];
});

/**
 * Whether an object exists in the bucket.
 */
export const objektImageExists = Effect.fn("Image.exists")(function* (
  bucket: S3Client,
  key: string,
) {
  const client = yield* imageClient;
  const response = yield* client
    .execute(
      HttpClientRequest.head(
        bucket.presign(key, { method: "HEAD", expiresIn: 300 }),
      ),
    )
    .pipe(
      Effect.mapError(
        (cause) =>
          new ImageStoreError({ key, status: cause.response?.status, cause }),
      ),
    );

  if (response.status === 200) {
    return true;
  }
  if (response.status === 404) {
    return false;
  }

  return yield* new ImageStoreError({
    key,
    status: response.status,
    cause: null,
  });
});

/**
 * Upload files sequentially in the given order, so the marker only lands once every earlier file has.
 */
export const uploadObjektImageFiles = Effect.fn("Image.upload")(function* (
  bucket: S3Client,
  files: readonly ObjektImageFile[],
) {
  const client = yield* imageClient;
  for (const file of files) {
    const request = HttpClientRequest.put(
      bucket.presign(file.key, { method: "PUT", expiresIn: 300 }),
    ).pipe(HttpClientRequest.bodyUint8Array(file.bytes, file.contentType));
    const response = yield* client.execute(request).pipe(
      Effect.mapError(
        (cause) =>
          new ImageStoreError({
            key: file.key,
            status: cause.response?.status,
            cause,
          }),
      ),
    );

    if (response.status !== 200) {
      return yield* new ImageStoreError({
        key: file.key,
        status: response.status,
        cause: null,
      });
    }
  }
});

/**
 * Mirror one COSMO image into R2 and return its version. Skips the download
 * when the marker file already exists; `force` rewrites every file, which is
 * safe to cache because the output depends only on the source URL.
 */
export const mirrorObjektImage = Effect.fn("Image.mirror")(function* (
  bucket: S3Client,
  target: {
    readonly side: ObjektImageSide;
    readonly slug: string;
    readonly sourceUrl: string;
    readonly force?: boolean;
  },
) {
  const ref = objektImageRef(target.side, target.slug, target.sourceUrl);
  if (
    target.force !== true &&
    (yield* objektImageExists(bucket, objektImageMarkerKey(ref)))
  ) {
    return ref.version;
  }

  const source = yield* fetchObjektImageSource(target.sourceUrl);
  const files = yield* renderObjektImage(ref, source, target.sourceUrl);
  yield* uploadObjektImageFiles(bucket, files);
  return ref.version;
});
