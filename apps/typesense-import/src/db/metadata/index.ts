import { defineRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { Effect, Redacted } from "effect";
import { getConfig } from "../../config";

export class Metadata extends Effect.Service<Metadata>()("app/Metadata", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;

    const relations = defineRelations(schema, (r) => ({
      objektMetadata: {},
    }));

    return drizzle(Redacted.value(config.DB_METADATA), { relations });
  }),
  dependencies: [],
}) {}
