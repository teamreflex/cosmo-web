import { DatabaseIndexer } from "@/db-indexer";
import { fetchMetadataV1 } from "@apollo/cosmo/server/metadata";
import type { CosmoObjektMetadataV1 } from "@apollo/cosmo/types/metadata";
import { collections, objekts } from "@apollo/database/indexer/schema";
import { addr, Addresses } from "@apollo/util";
import { sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import type { ScheduledTask } from "../task";

const BATCH_SIZE = 100;
// sequentially probe this many of the oldest rows to gauge v1 uptime before
// committing to the full parallel fan-out.
const PROBE_SIZE = 10;
const PROBE_SUCCESS_RATIO = 0.5;
const FETCH_CONCURRENCY = 10;
const TIMEOUT_MS = 5_000;

type Placeholder = {
  id: string;
  collection: { id: string; contract: string };
};

type ObjektRepair = { id: string; serial: number; transferable: boolean };
type CollectionRepair = {
  id: string;
  contract: string;
  textColor: string;
  backImage: string;
  accentColor: string;
};

/**
 * Fetch authoritative v1 metadata for a token, swallowing any failure into None
 * so a down/missing token simply skips rather than failing the run.
 */
function fetchMetadata(tokenId: string) {
  return Effect.option(
    Effect.tryPromise(() =>
      fetchMetadataV1(tokenId, AbortSignal.timeout(TIMEOUT_MS)),
    ),
  );
}

/**
 * Record an objekt's serial/transferable repair, plus a one-time placeholder
 * collection repair (deduped by id) when the collection is still zero-address.
 */
function recordRepair(
  placeholder: Placeholder,
  metadata: CosmoObjektMetadataV1,
  objektRepairs: ObjektRepair[],
  collectionRepairs: Map<string, CollectionRepair>,
) {
  const { objekt } = metadata;
  objektRepairs.push({
    id: placeholder.id,
    serial: objekt.objektNo,
    transferable: objekt.transferable,
  });

  if (
    placeholder.collection.contract === Addresses.NULL &&
    !collectionRepairs.has(placeholder.collection.id)
  ) {
    collectionRepairs.set(placeholder.collection.id, {
      id: placeholder.collection.id,
      contract: addr(objekt.tokenAddress),
      textColor: objekt.textColor,
      backImage: objekt.backImage,
      accentColor: objekt.accentColor,
    });
  }
}

/**
 * Repair serial-0 objekts left behind by the indexer's v3 metadata fallback.
 * Sequentially probes the oldest few to gauge v1 uptime, fans the rest out in
 * parallel only when v1 looks healthy (otherwise defers them to the next tick),
 * and batches the serial/transferable fixes plus any placeholder-collection
 * cosmetics into a single update per table.
 */
export const backfillSerialTask = {
  name: "backfill-serial",
  cron: "*/5 * * * *",
  effect: Effect.gen(function* () {
    const indexer = yield* DatabaseIndexer;

    const placeholders = yield* Effect.tryPromise({
      try: () =>
        indexer.query.objekts.findMany({
          where: { serial: { eq: 0 } },
          orderBy: { mintedAt: "asc" },
          limit: BATCH_SIZE,
          columns: { id: true },
          with: {
            collection: { columns: { id: true, contract: true } },
          },
        }),
      catch: (cause) => new BackfillError({ cause }),
    });

    if (placeholders.length === 0) {
      return;
    }

    const objektRepairs: ObjektRepair[] = [];
    const collectionRepairs = new Map<string, CollectionRepair>();

    // sequential probe to gauge v1 uptime before committing to the fan-out
    const probe = placeholders.slice(0, PROBE_SIZE);
    const rest = placeholders.slice(PROBE_SIZE);
    let probeSuccesses = 0;

    for (const placeholder of probe) {
      const result = yield* fetchMetadata(placeholder.id);
      if (result._tag === "Some") {
        probeSuccesses++;
        recordRepair(
          placeholder,
          result.value,
          objektRepairs,
          collectionRepairs,
        );
      }
    }

    // only fan out the rest if the probe shows v1 is healthy; otherwise leave
    // them serial-0 to be re-selected (oldest-first) on the next tick.
    if (
      rest.length > 0 &&
      probeSuccesses / probe.length >= PROBE_SUCCESS_RATIO
    ) {
      const results = yield* Effect.all(
        rest.map((placeholder) =>
          fetchMetadata(placeholder.id).pipe(
            Effect.map((result) => ({ placeholder, result })),
          ),
        ),
        { concurrency: FETCH_CONCURRENCY },
      );

      for (const { placeholder, result } of results) {
        if (result._tag === "Some") {
          recordRepair(
            placeholder,
            result.value,
            objektRepairs,
            collectionRepairs,
          );
        }
      }
    } else if (rest.length > 0) {
      yield* Effect.logWarning(
        `Deferring ${rest.length} serial-0 rows: v1 probe only ${probeSuccesses}/${probe.length} healthy`,
      );
    }

    if (objektRepairs.length === 0) {
      return;
    }

    // batch every repair into a single update per table, in one transaction so
    // the objekt and placeholder-collection fixes commit together.
    yield* Effect.tryPromise({
      try: () =>
        indexer.transaction(async (tx) => {
          const objektValues = sql.join(
            objektRepairs.map(
              (r) =>
                sql`(${r.id}, ${r.serial}::int, ${r.transferable}::boolean)`,
            ),
            sql`, `,
          );
          await tx
            .update(objekts)
            .set({
              serial: sql`data.serial`,
              transferable: sql`data.transferable`,
            })
            .from(
              sql`(values ${objektValues}) as data(id, serial, transferable)`,
            )
            .where(sql`${objekts.id} = data.id`);

          if (collectionRepairs.size > 0) {
            const collectionValues = sql.join(
              [...collectionRepairs.values()].map(
                (r) =>
                  sql`(${r.id}, ${r.contract}, ${r.textColor}, ${r.backImage}, ${r.accentColor})`,
              ),
              sql`, `,
            );
            await tx
              .update(collections)
              .set({
                contract: sql`data.contract`,
                textColor: sql`data.text_color`,
                backImage: sql`data.back_image`,
                accentColor: sql`data.accent_color`,
              })
              .from(
                sql`(values ${collectionValues}) as data(id, contract, text_color, back_image, accent_color)`,
              )
              .where(sql`${collections.id} = data.id`);
          }
        }),
      catch: (cause) => new BackfillError({ cause }),
    });

    yield* Effect.logInfo(
      `Backfilled ${objektRepairs.length} serial-0 objekts, repaired ${collectionRepairs.size} placeholder collections`,
    );
  }),
} satisfies ScheduledTask;

/**
 * Failed to backfill serial-0 objekts.
 */
export class BackfillError extends Data.TaggedError("BackfillError")<{
  readonly cause: unknown;
}> {}
