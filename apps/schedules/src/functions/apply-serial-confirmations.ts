import { DatabaseIndexer } from "@/db-indexer";
import {
  collections,
  objekts,
  serialConfirmations,
} from "@apollo/database/indexer/schema";
import { eq, ne } from "drizzle-orm";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";
import { recomputeCollections } from "./recompute-serials";

/**
 * Apply serials staff confirmed in the admin panel: re-estimate every
 * collection holding a confirmation its objekt doesn't match yet, which
 * re-anchors the estimates around it. Finding them is one join over the
 * small confirmation table, so it runs often enough that a report lands
 * within minutes.
 */
export const applySerialConfirmationsTask = {
  name: "apply-serial-confirmations",
  cron: "*/5 * * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseIndexer;
    const pending = yield* db
      .selectDistinct({
        id: collections.id,
        slug: collections.slug,
        onOffline: collections.onOffline,
      })
      .from(serialConfirmations)
      .innerJoin(objekts, eq(objekts.id, serialConfirmations.tokenId))
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(ne(objekts.serial, serialConfirmations.serial));
    if (pending.length === 0) {
      return;
    }

    const changed = yield* recomputeCollections(pending);
    yield* Effect.logInfo(
      `Applied serial confirmations to ${pending.length} collections: ${changed} serials changed`,
    );
  }),
} satisfies ScheduledTask;
