// oxlint-disable anti-slop/no-shape-in-symbol-names -- EffectLoggerShape/EffectCacheShape are upstream drizzle-orm names
import type { SQL } from "bun";
import {
  type AnyRelations,
  type EmptyRelations,
  entityKind,
} from "drizzle-orm";
import { bunSqlPgCodecs } from "drizzle-orm/bun-sql/postgres/codecs";
import {
  EffectCache,
  type EffectCacheShape,
} from "drizzle-orm/cache/core/cache-effect";
import { EffectLogger, type EffectLoggerShape } from "drizzle-orm/effect-core";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  type EffectDrizzlePgConfig,
  PgEffectDatabase,
} from "drizzle-orm/pg-core/effect";
import * as Effect from "effect/Effect";
import {
  type BunSQLEffectQueryHKT,
  type BunSQLEffectQueryResultHKT,
  BunSQLEffectSession,
} from "./session";

export class BunSQLEffectDatabase<
  TRelations extends AnyRelations = EmptyRelations,
> extends PgEffectDatabase<
  BunSQLEffectQueryHKT,
  BunSQLEffectQueryResultHKT,
  TRelations
> {
  static override readonly [entityKind]: string = "BunSQLEffectDatabase";
}

export interface BunSQLEffectDrizzleConfig<
  TRelations extends AnyRelations = EmptyRelations,
> extends Omit<EffectDrizzlePgConfig<TRelations>, "relations" | "schema"> {
  client: SQL;
  relations: TRelations;
  logger?: EffectLoggerShape;
  cache?: EffectCacheShape;
}

/**
 * Creates a drizzle Effect database backed by Bun's native SQL client, mirroring
 * drizzle-orm/effect-postgres's make/makeWithDefaults. The client is passed in
 * directly instead of resolved from a PgClient service, and the logger/cache
 * default to drizzle's no-op implementations, so no services are required.
 */
export const make = <TRelations extends AnyRelations = EmptyRelations>(
  config: BunSQLEffectDrizzleConfig<TRelations>,
): Effect.Effect<BunSQLEffectDatabase<TRelations> & { $client: SQL }> =>
  Effect.gen(function* () {
    const logger = config.logger ?? (yield* EffectLogger.make);
    const cache = config.cache ?? (yield* EffectCache.make);
    const dialect = new PgDialect({
      // upstream gates this through jitCompatCheck (internal); Bun always supports the Function constructor it probes
      useJitMappers: config.jit === true,
      codecs: config.codecs ?? bunSqlPgCodecs,
    });
    const session = new BunSQLEffectSession<
      BunSQLEffectQueryResultHKT,
      TRelations
    >(config.client, dialect, config.relations, { logger, cache });
    const db = new BunSQLEffectDatabase<TRelations>(
      dialect,
      session,
      config.relations,
    );
    db.$cache = { invalidate: cache.onMutate };
    return Object.assign(db, { $client: config.client });
  });
