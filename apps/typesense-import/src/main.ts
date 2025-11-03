import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { Duration, Layer, Schedule } from "effect";
import * as Effect from "effect/Effect";
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
import { initializeTimestamp } from "./timestamp-state";
import { Typesense } from "./typesense";

const main = Effect.gen(function* () {
  const config = yield* getConfig;
  const timestamp = yield* initializeTimestamp;

  // perform initial setup
  yield* setupTypesenseApiKey;
  yield* setupTypesenseCollection;
  yield* setupTypesenseSynonyms;

  // start the import loop
  yield* Effect.gen(function* () {
    const currentTimestamp = yield* timestamp.get;
    yield* Effect.logInfo(`Fetching collections from ${currentTimestamp}`);

    const indexer = yield* Indexer;
    const metadata = yield* Metadata;

    const collections = yield* Effect.promise(async () => {
      return await indexer.query.collections.findMany({
        where: {
          createdAt: {
            gt: currentTimestamp ?? undefined,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    });

    yield* Effect.logInfo(`Found ${collections.length} collections`);
    if (collections.length === 0) {
      return void 0;
    }

    // update the timestamp
    const newTimestamp = collections[collections.length - 1].createdAt;
    yield* timestamp.set(newTimestamp);

    // write to file
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const lastCreatedAtPath = path.join(__dirname, "../lastCreatedAt.txt");
    yield* fs.writeFileString(lastCreatedAtPath, newTimestamp);

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
