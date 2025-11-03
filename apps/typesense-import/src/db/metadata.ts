import { drizzle } from "drizzle-orm/neon-http";
import { relations } from "@apollo/database/web/relations";
import { Effect, Redacted } from "effect";
import { getConfig } from "../config";

export class Metadata extends Effect.Service<Metadata>()("app/Metadata", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;

    return drizzle(Redacted.value(config.DB_METADATA), { relations });
  }),
  dependencies: [],
}) {}
