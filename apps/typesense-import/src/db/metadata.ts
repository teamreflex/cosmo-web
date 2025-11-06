import { drizzle } from "drizzle-orm/node-postgres";
import { relations } from "@apollo/database/web/relations";
import { Effect, Redacted } from "effect";
import { getConfig } from "../config";

export class Metadata extends Effect.Service<Metadata>()("app/Metadata", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;
    return drizzle(Redacted.value(config.WEB_DATABASE_URL), { relations });
  }),
  dependencies: [],
}) {}
