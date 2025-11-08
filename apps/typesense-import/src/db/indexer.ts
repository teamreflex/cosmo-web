import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/indexer/relations";
import { Effect, Redacted } from "effect";
import { getConfig } from "../config";

export class Indexer extends Effect.Service<Indexer>()("app/Indexer", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;
    return drizzle(Redacted.value(config.INDEXER_DATABASE_URL), { relations });
  }),
  dependencies: [],
}) {}
