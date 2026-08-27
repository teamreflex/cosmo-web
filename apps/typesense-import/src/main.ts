import { BunRuntime, BunServices } from "@effect/platform-bun";
import {
  Array as Arr,
  Clock,
  Data,
  Duration,
  Effect,
  Layer,
  Ref,
  Schedule,
} from "effect";
import { getEdition, getShortCode } from "./collections";
import { Env } from "./config";
import { Indexer } from "./db/indexer";
import { Metadata } from "./db/metadata";
import {
  COLLECTION_NAME,
  setupTypesenseApiKey,
  setupTypesenseCollection,
  setupTypesenseSynonyms,
} from "./setup";
import { Typesense } from "./typesense";

const main = Effect.gen(function* () {
  const env = yield* Env;
  const indexer = yield* Indexer;
  const metadata = yield* Metadata;
  const typesense = yield* Typesense;
  const timestamp = yield* Ref.make<number | null>(null);

  // perform initial setup
  yield* setupTypesenseApiKey;
  yield* setupTypesenseCollection;
  yield* setupTypesenseSynonyms;

  // start the import loop
  yield* Effect.gen(function* () {
    const startTime = yield* Clock.currentTimeMillis;

    const current = yield* Ref.get(timestamp);
    yield* Effect.logInfo(
      `Fetching collections from ${current === null ? "the start" : new Date(current).toISOString()}`,
    );

    const collections = yield* indexer.query.collections.findMany({
      where: {
        ...(current !== null && {
          createdAt: { gt: new Date(current).toISOString() },
        }),
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    yield* Effect.logInfo(`Found ${collections.length} collections`);
    if (collections.length === 0) {
      // set the timestamp to the start time so nothing is missed
      yield* Ref.set(timestamp, startTime);
      return void 0;
    }

    // for each collection, fetch the metadata
    const slugs = collections.map((c) => c.slug);
    const descriptions = yield* metadata.query.collectionData.findMany({
      where: {
        collectionId: {
          in: slugs,
        },
      },
      columns: {
        collectionId: true,
        description: true,
      },
    });

    // canonical member sort order, joined onto collection.member for member sorting
    const memberRows = yield* indexer.query.members.findMany({
      columns: {
        name: true,
        sortOrder: true,
      },
    });

    // build the new objects that will be inserted into typesense
    const descMap = new Map(
      descriptions.map((d) => [d.collectionId, d.description]),
    );
    const memberSortMap = new Map(
      memberRows.map((row) => [row.name, row.sortOrder]),
    );
    const zipped = collections.map((c) => ({
      // collection fields
      ...c,
      createdAt: new Date(c.createdAt).getTime(),
      // custom fields
      description: descMap.get(c.slug),
      memberSortOrder: memberSortMap.get(c.member),
      shortCode:
        c.artist !== "idntt"
          ? getShortCode(c.collectionNo, c.season)
          : c.collectionNo, // a101z, b101z, aa101z etc
      edition: getEdition(c.collectionNo, c.class), // 1st, 2nd, 3rd
    }));

    // bulk upsert the objects into typesense
    yield* Effect.forEach(Arr.chunksOf(zipped, 500), (chunk) =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`Upserting ${chunk.length} objects`);
        yield* Effect.tryPromise({
          try: () =>
            typesense.collections(COLLECTION_NAME).documents().import(chunk, {
              action: "upsert",
            }),
          catch: (cause) => new UpsertObjektsError({ cause }),
        });
      }),
    );
    yield* Effect.logInfo(`Upserted ${zipped.length} objects`);

    // advance the watermark only after a fully successful upsert — a failed
    // tick re-fetches and re-upserts the whole batch next tick (idempotent)
    const newTimestamp = collections[collections.length - 1].createdAt;
    yield* Ref.set(timestamp, new Date(newTimestamp).getTime());
  }).pipe(
    // a transient tick failure logs and waits for the next tick instead of
    // killing the daemon; setup failures above stay fatal at boot
    Effect.catchCause((cause) => Effect.logError("Import tick failed", cause)),
    Effect.schedule(Schedule.spaced(Duration.millis(env.LOOP_INTERVAL))),
  );
});

BunRuntime.runMain(
  main.pipe(
    Effect.provide(
      Layer.mergeAll(
        BunServices.layer,
        Env.layer,
        Typesense.layer,
        Indexer.layer,
        Metadata.layer,
      ),
    ),
  ),
);

/**
 * Failed to bulk-upsert documents into Typesense.
 */
export class UpsertObjektsError extends Data.TaggedError("UpsertObjektsError")<{
  readonly cause: unknown;
}> {}
