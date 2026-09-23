import type { ObjektImageSide } from "@apollo/image";
import { isSourceFailure } from "@apollo/image/errors";
import { runImage } from "@apollo/image/runtime";
import { mirrorObjektImage, objektImageRef } from "@apollo/image/server";
import { chunk } from "@apollo/util";
import * as Sentry from "@sentry/bun";
import type { Store } from "@subsquid/typeorm-store";
import { S3Client } from "bun";
import { env } from "./env";
import type { Collection } from "./model";
import type { ProcessorContext } from "./processor";

const CONCURRENCY = 4;

/**
 * Upper bound for one mirror, across every retry of every request in it.
 */
const MIRROR_TIMEOUT_MS = 60_000;

/**
 * How long an image whose source is broken waits before another attempt.
 */
const SOURCE_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * How long all mirroring pauses after an infrastructure failure, so an R2 or
 * COSMO outage costs one timeout per window instead of one per transfer.
 */
const BREAKER_MS = 5 * 60 * 1000;

const bucket = new S3Client({
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  bucket: env.R2_BUCKET,
  accessKeyId: env.R2_ACCESS_KEY,
  secretAccessKey: env.R2_SECRET_KEY,
});

/**
 * `side/slug` → time a broken source may be retried. Only failing images get an entry, so this stays tiny.
 */
const cooldowns = new Map<string, number>();
let breakerOpenUntil = 0;

type MirrorTarget = {
  readonly side: ObjektImageSide;
  readonly slug: string;
  readonly sourceUrl: string;
  readonly version: string | null;
  readonly setVersion: (version: string) => void;
};

/**
 * Mirror the front and back images of every collection in the batch whose
 * stored version doesn't match its current source URL.
 */
export async function mirrorImages(
  ctx: ProcessorContext<Store>,
  collections: Iterable<Collection>,
) {
  if (Date.now() < breakerOpenUntil) {
    return;
  }

  const now = Date.now();
  const pending = Array.from(collections)
    .flatMap((collection): MirrorTarget[] => [
      {
        side: "front",
        slug: collection.slug,
        sourceUrl: collection.frontImage,
        version: collection.frontImageVersion,
        setVersion: (version) => {
          collection.frontImageVersion = version;
        },
      },
      {
        side: "back",
        slug: collection.slug,
        sourceUrl: collection.backImage,
        version: collection.backImageVersion,
        setVersion: (version) => {
          collection.backImageVersion = version;
        },
      },
    ])
    .filter(
      (target) =>
        target.sourceUrl !== "" &&
        objektImageRef(target.side, target.slug, target.sourceUrl).version !==
          target.version &&
        (cooldowns.get(`${target.side}/${target.slug}`) ?? 0) <= now,
    );
  if (pending.length === 0) {
    return;
  }

  ctx.log.info(`Mirroring ${pending.length} objekt images`);

  await chunk(pending, CONCURRENCY, async (group) => {
    // an earlier group may have tripped the breaker
    if (Date.now() < breakerOpenUntil) {
      return;
    }

    const results = await Promise.allSettled(
      group.map((target) =>
        runImage(
          mirrorObjektImage(bucket, {
            side: target.side,
            slug: target.slug,
            sourceUrl: target.sourceUrl,
          }),
          AbortSignal.timeout(MIRROR_TIMEOUT_MS),
        ),
      ),
    );

    for (const [index, target] of group.entries()) {
      const key = `${target.side}/${target.slug}`;
      const result = results[index];
      if (result?.status === "fulfilled") {
        target.setVersion(result.value);
        cooldowns.delete(key);
        continue;
      }

      const error = result?.reason;
      const source = error instanceof Error && isSourceFailure(error);
      if (source) {
        cooldowns.set(key, Date.now() + SOURCE_COOLDOWN_MS);
      } else {
        breakerOpenUntil = Date.now() + BREAKER_MS;
      }

      ctx.log.warn(
        `Unable to mirror ${target.side} image for ${target.slug} (${source ? "source" : "infrastructure"}): ${String(error)}`,
      );
      Sentry.captureException(error, {
        level: "error",
        fingerprint: ["indexer-image-mirror-failed"],
        tags: {
          failure: "image",
          side: target.side,
          kind: source ? "source" : "infrastructure",
        },
        extra: { slug: target.slug, sourceUrl: target.sourceUrl },
      });
    }
  });
}
