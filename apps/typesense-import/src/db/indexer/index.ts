import { drizzle } from "drizzle-orm/pg-proxy";
import { ofetch } from "ofetch";
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";
import { Effect, Redacted } from "effect";
import { getConfig } from "../../config";

export class Indexer extends Effect.Service<Indexer>()("app/Indexer", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;

    const relations = defineRelations(schema, (r) => ({
      collections: {},
    }));

    return drizzle(
      async (sql, params, method) => {
        try {
          const rows = await ofetch(
            `${Redacted.value(config.DB_INDEXER)}/query`,
            {
              retry: false,
              method: "POST",
              headers: {
                "proxy-key": Redacted.value(config.DB_INDEXER_KEY),
              },
              body: JSON.stringify({
                sql,
                params,
                method,
              }),
            }
          );

          return { rows };
        } catch (err) {
          console.error("Error from Drizzle HTTP proxy: ", err);
          return { rows: [] };
        }
      },
      { relations }
    );
  }),
  dependencies: [],
}) {}
