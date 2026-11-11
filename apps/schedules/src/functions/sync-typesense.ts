import { DatabaseIndexer } from "@/db-indexer";
import { getEdition, getShortCode } from "@/search/collections";
import {
  COLLECTION_NAME,
  setupTypesenseApiKey,
  setupTypesenseCollection,
  setupTypesenseSynonyms,
} from "@/search/setup";
import { Typesense } from "@/typesense";
import { DatabaseWeb } from "@apollo/services/database-web";
import { Array as Arr, Data, Effect, Option, Ref } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Copy collections from the indexer into the Typesense collection behind
 * objekt search. The first run in a process sets Typesense up and imports
 * every collection; later runs import the collections created since and the
 * ones whose `unobtainable` flag changed. Every 5 minutes, so a new
 * collection is searchable within that.
 */
export const syncTypesenseTask = {
  name: "sync-typesense",
  cron: "*/5 * * * *",
  effect: Effect.gen(function* () {
    const indexer = yield* DatabaseIndexer;
    const web = yield* DatabaseWeb;
    const { client, imported } = yield* Typesense;

    const previous = yield* Ref.get(imported);

    /**
     * Setup can drop and recreate the collection, which deletes every
     * document, so it only runs in the run that imports every collection.
     */
    if (Option.isNone(previous)) {
      yield* setupTypesenseApiKey;
      yield* setupTypesenseCollection;
      yield* setupTypesenseSynonyms;
    }

    // read before the new collections, so a flip racing this run is caught on the next one
    const flaggedNow: ReadonlySet<string> = new Set(
      (yield* indexer.query.collections.findMany({
        where: { unobtainable: true },
        columns: { id: true },
      })).map((c) => c.id),
    );

    const collections = yield* indexer.query.collections.findMany({
      where: {
        ...(Option.isSome(previous) && {
          createdAt: { gt: new Date(previous.value.watermark).toISOString() },
        }),
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // unobtainable is flipped by hand long after createdAt, so re-import collections whose flag changed
    const newIds = new Set(collections.map((c) => c.id));
    const flippedIds = Option.isSome(previous)
      ? [...flaggedNow.symmetricDifference(previous.value.flagged)].filter(
          (id) => !newIds.has(id),
        )
      : [];
    const flipped =
      flippedIds.length === 0
        ? []
        : yield* indexer.query.collections.findMany({
            where: { id: { in: flippedIds } },
          });

    const toImport = [...collections, ...flipped];
    if (toImport.length > 0) {
      // canonical member sort order, joined onto collection.member for member sorting
      const memberSortMap = new Map(
        (yield* indexer.query.members.findMany({
          columns: {
            name: true,
            sortOrder: true,
          },
        })).map((row) => [row.name, row.sortOrder]),
      );

      yield* Effect.forEach(Arr.chunksOf(toImport, 500), (chunk) =>
        Effect.gen(function* () {
          /**
           * Descriptions live in the web database. They are read a chunk at a
           * time because every task shares its one connection, and one
           * statement for every collection would hold the others up.
           */
          const descMap = new Map(
            (yield* web.query.collectionData.findMany({
              where: {
                collectionId: {
                  in: chunk.map((c) => c.slug),
                },
              },
              columns: {
                collectionId: true,
                description: true,
              },
            })).map((d) => [d.collectionId, d.description]),
          );

          yield* Effect.tryPromise({
            try: () =>
              client
                .collections(COLLECTION_NAME)
                .documents()
                .import(
                  chunk.map((c) => ({
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
                  })),
                  { action: "upsert" },
                ),
            catch: (cause) => new UpsertDocumentsError({ cause }),
          });
        }),
      );

      yield* Effect.logInfo(
        `Imported ${collections.length} new collections and ${flipped.length} unobtainable flips`,
      );
    }

    /**
     * The watermark and the flags only move after every upsert succeeded. A
     * failed run imports the same batch again next time, which is harmless
     * because imports upsert.
     *
     * The watermark is the newest imported createdAt, never the clock:
     * createdAt is the block time of a collection's first mint and the
     * indexer writes the row after it, so a clock watermark would skip a
     * collection written late.
     */
    const newest = collections.at(-1);
    yield* Ref.set(
      imported,
      Option.some({
        watermark:
          newest === undefined
            ? Option.match(previous, {
                onNone: () => 0,
                onSome: ({ watermark }) => watermark,
              })
            : new Date(newest.createdAt).getTime(),
        flagged: flaggedNow,
      }),
    );
  }),
} satisfies ScheduledTask;

/**
 * Failed to bulk-upsert documents into Typesense.
 */
export class UpsertDocumentsError extends Data.TaggedError(
  "UpsertDocumentsError",
)<{
  readonly cause: unknown;
}> {}
