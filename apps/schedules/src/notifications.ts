import { notifications } from "@apollo/database/web/schema";
import type { NewNotification } from "@apollo/database/web/types";
import { DatabaseWeb } from "@apollo/services/database-web";
import { Array, Effect } from "effect";

const BATCH_SIZE = 100;

/**
 * Insert notifications in a batched manner.
 */
export const insertNotifications = Effect.fn("insertNotifications")(function* (
  rows: NewNotification[],
) {
  const db = yield* DatabaseWeb;
  yield* Effect.forEach(
    Array.chunksOf(rows, BATCH_SIZE),
    (chunk) => db.insert(notifications).values(chunk).onConflictDoNothing(),
    { discard: true },
  );
});
