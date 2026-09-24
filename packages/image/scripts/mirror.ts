// oxlint-disable no-console -- CLI script reporting progress on stdout
import { collections } from "@apollo/database/indexer/schema";
import { S3Client, SQL } from "bun";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { Effect } from "effect";
import { parseArgs } from "node:util";
import * as z from "zod";
import type { ObjektImageSide } from "../src/index";
import { runImage } from "../src/runtime";
import { mirrorObjektImage } from "../src/server";

/**
 * Mirrors every collection's front and back image from the indexer database
 * into the bucket at R2_ENDPOINT and points its version column at the mirror,
 * for setting up a fresh environment against the s3proxy docker service.
 * Images whose marker already exists are skipped, so re-running resumes and
 * retries failures.
 *
 *   turbo image:mirror -- [--concurrency 8] [--limit 20]
 */

const env = z
  .object({
    INDEXER_DATABASE_URL: z.url(),
    R2_ENDPOINT: z.url(),
    R2_BUCKET: z.string().min(1),
    R2_ACCESS_KEY: z.string().min(1),
    R2_SECRET_KEY: z.string().min(1),
  })
  .parse(process.env);

const args = z
  .object({
    concurrency: z.coerce.number().int().positive(),
    limit: z.coerce.number().int().positive().optional(),
  })
  .parse(
    parseArgs({
      args: Bun.argv.slice(2),
      options: {
        concurrency: { type: "string", default: "8" },
        limit: { type: "string" },
      },
    }).values,
  );

type Target = {
  readonly side: ObjektImageSide;
  readonly slug: string;
  readonly sourceUrl: string;
  readonly version: string | null;
};

const client = new SQL({ url: env.INDEXER_DATABASE_URL });
const db = drizzle({ client });

const bucket = new S3Client({
  endpoint: env.R2_ENDPOINT,
  bucket: env.R2_BUCKET,
  accessKeyId: env.R2_ACCESS_KEY,
  secretAccessKey: env.R2_SECRET_KEY,
});

const rows = await db
  .select({
    slug: collections.slug,
    frontImage: collections.frontImage,
    backImage: collections.backImage,
    frontImageVersion: collections.frontImageVersion,
    backImageVersion: collections.backImageVersion,
  })
  .from(collections);

const targets = rows
  .flatMap((row): Target[] => [
    {
      side: "front",
      slug: row.slug,
      sourceUrl: row.frontImage,
      version: row.frontImageVersion,
    },
    {
      side: "back",
      slug: row.slug,
      sourceUrl: row.backImage,
      version: row.backImageVersion,
    },
  ])
  // v3-era collections have no back image
  .filter((target) => target.sourceUrl !== "")
  .slice(0, args.limit);

/**
 * Guarded on the source URL, so an image the indexer replaced mid-run keeps
 * the version the indexer gave it.
 */
function saveVersion(target: Target, version: string) {
  return target.side === "front"
    ? db
        .update(collections)
        .set({ frontImageVersion: version })
        .where(
          and(
            eq(collections.slug, target.slug),
            eq(collections.frontImage, target.sourceUrl),
          ),
        )
    : db
        .update(collections)
        .set({ backImageVersion: version })
        .where(
          and(
            eq(collections.slug, target.slug),
            eq(collections.backImage, target.sourceUrl),
          ),
        );
}

console.log(
  `Mirroring ${targets.length} images into ${env.R2_BUCKET} at ${env.R2_ENDPOINT}`,
);

const started = performance.now();
let done = 0;
let saved = 0;
const failures: string[] = [];

await runImage(
  Effect.forEach(
    targets,
    (target) =>
      mirrorObjektImage(bucket, target).pipe(
        Effect.flatMap((version) =>
          version === target.version
            ? Effect.void
            : Effect.promise(() => saveVersion(target, version)).pipe(
                Effect.tap(() =>
                  Effect.sync(() => {
                    saved++;
                  }),
                ),
              ),
        ),
        Effect.catch((error) =>
          Effect.sync(() => {
            failures.push(`${target.side} ${target.slug}: ${error.message}`);
          }),
        ),
        Effect.tap(() =>
          Effect.sync(() => {
            done++;
            if (done % 500 === 0 || done === targets.length) {
              const seconds = (performance.now() - started) / 1000;
              console.log(
                `${done}/${targets.length} (${saved} versions saved, ${failures.length} failed), ${(done / seconds).toFixed(1)}/s`,
              );
            }
          }),
        ),
      ),
    { concurrency: args.concurrency, discard: true },
  ),
);
await client.close();

if (failures.length > 0) {
  for (const failure of failures.slice(0, 50)) {
    console.error(failure);
  }
  console.error(`${failures.length} images failed; re-run to retry them`);
  process.exitCode = 1;
}
