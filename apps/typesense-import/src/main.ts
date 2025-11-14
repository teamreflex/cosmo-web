import { BunContext, BunRuntime } from "@effect/platform-bun";
import { Duration, Effect, Layer, Ref, Schedule } from "effect";
import { getEdition, getShortCode } from "./collections";
import { getConfig } from "./config";
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
  const config = yield* getConfig;
  const timestamp = yield* Ref.make<number | null>(null);

  // perform initial setup
  yield* setupTypesenseApiKey;
  yield* setupTypesenseCollection;
  yield* setupTypesenseSynonyms;

  // start the import loop
  yield* Effect.gen(function* () {
    const startTime = Date.now();

    const current = yield* Ref.get(timestamp);
    yield* Effect.logInfo(
      `Fetching collections from ${current === null ? "the start" : new Date(current).toISOString()}`,
    );

    const indexer = yield* Indexer;
    const metadata = yield* Metadata;

    const collections = yield* Effect.promise(async () => {
      return await indexer.query.collections.findMany({
        where: {
          createdAt: {
            gt: current ? new Date(current).toISOString() : undefined,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    });

    yield* Effect.logInfo(`Found ${collections.length} collections`);
    if (collections.length === 0) {
      // set the timestamp to the start time so nothing is missed
      yield* Ref.set(timestamp, startTime);
      return void 0;
    }

    // update the timestamp
    const newTimestamp = collections[collections.length - 1].createdAt;
    yield* Ref.set(timestamp, new Date(newTimestamp).getTime());

    // for each collection, fetch the metadata
    const slugs = collections.map((c) => c.slug);
    const descriptions = yield* Effect.promise(async () => {
      return await metadata.query.objektMetadata.findMany({
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
    });

    // build the new objects that will be inserted into typesense
    const zipped = collections.map((c) => {
      const description = descriptions.find((d) => d.collectionId === c.slug);
      return {
        // collection fields
        ...c,
        createdAt: new Date(c.createdAt).getTime(),
        // custom fields
        description: description?.description,
        shortCode:
          c.artist !== "idntt"
            ? getShortCode(c.collectionNo, c.season)
            : c.collectionNo, // a101z, b101z, aa101z etc
        edition: getEdition(c.collectionNo, c.class), // 1st, 2nd, 3rd
      };
    });

    // bulk upsert the objects into typesense
    const typesense = yield* Typesense;
    let count = 0;
    for (let i = 0; i < zipped.length; i += 500) {
      const chunk = zipped.slice(i, i + 500);
      yield* Effect.logInfo(`Upserting ${chunk.length} objects`);
      yield* Effect.promise(async () => {
        await typesense.collections(COLLECTION_NAME).documents().import(chunk, {
          action: "upsert",
        });
      });
      count += chunk.length;
    }
    yield* Effect.logInfo(`Upserted ${count} objects`);
  }).pipe(
    Effect.schedule(Schedule.spaced(Duration.millis(config.LOOP_INTERVAL))),
  );
});

BunRuntime.runMain(
  main.pipe(
    Effect.provide(
      Layer.mergeAll(
        BunContext.layer,
        Typesense.Default,
        Indexer.Default,
        Metadata.Default,
      ),
    ),
  ),
);
