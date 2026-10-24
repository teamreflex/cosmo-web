import { Context, Layer, Schema } from "effect";
import { PersistedQueue } from "effect/persistence";

/**
 * The Redis store behind every queue: the web app offers jobs and the
 * schedules app takes them. Each app provides its own `Redis.Redis`.
 */
const storeLayer = PersistedQueue.layerStoreRedis();

const factoryLayer = PersistedQueue.layer.pipe(Layer.provide(storeLayer));

/**
 * Drops completed job ids after 30 days and keeps failed jobs as a dead-letter record.
 * Run it in one process: the schedules app.
 */
export const cleanupLayer = PersistedQueue.layerCleanup().pipe(
  Layer.provide(storeLayer),
);

const TradeNotificationsJob = Schema.Struct({
  side: Schema.Literals(["have", "want"]),
  sourceUserId: Schema.String,
  sourceListId: Schema.String,
  slugs: Schema.Array(Schema.String),
});
export type TradeNotificationsJob = typeof TradeNotificationsJob.Type;

/**
 * Collections just added to a trade-active have or want list, to match
 * against other users' trade-active lists.
 */
export class TradeNotificationsQueue extends Context.Service<TradeNotificationsQueue>()(
  "apollo/TradeNotificationsQueue",
  {
    make: PersistedQueue.make({
      name: "trade-notifications",
      schema: TradeNotificationsJob,
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(factoryLayer),
  );
}
