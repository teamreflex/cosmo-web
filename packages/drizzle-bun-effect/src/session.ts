// oxlint-disable anti-slop/no-shape-in-symbol-names -- EffectLoggerShape/EffectCacheShape are upstream drizzle-orm names
import type { SQL } from "bun";
import {
  type AnyRelations,
  type Assume,
  entityKind,
  type Query,
  sql,
} from "drizzle-orm";
import type { EffectCacheShape } from "drizzle-orm/cache/core/cache-effect";
import type { WithCacheConfig } from "drizzle-orm/cache/core/types";
import type {
  EffectDrizzleQueryError,
  EffectLoggerShape,
  QueryEffectHKTBase,
} from "drizzle-orm/effect-core";
import type {
  PgDialect,
  PgQueryResultHKT,
  PgTransactionConfig,
  PreparedQueryConfig,
} from "drizzle-orm/pg-core";
import {
  PgEffectPreparedQuery,
  PgEffectSession,
  PgEffectTransaction,
} from "drizzle-orm/pg-core/effect";
import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";
import * as Exit from "effect/Exit";
import { SqlError } from "effect/unstable/sql/SqlError";
import { classifyPgError } from "./sql-error";

export interface BunSQLEffectQueryHKT extends QueryEffectHKTBase {
  readonly error: EffectDrizzleQueryError;
  readonly context: never;
}

export interface BunSQLEffectQueryResultHKT extends PgQueryResultHKT {
  type: readonly Assume<this["row"], object>[];
}

export interface BunSQLEffectSessionOptions {
  logger: EffectLoggerShape;
  cache: EffectCacheShape;
}

/**
 * Rebuilds the statements PgEffectTransaction.getTransactionConfigStatements
 * produces upstream (that method is internal and stripped from the public types).
 */
const transactionConfigStatements = (
  dialect: PgDialect,
  config: PgTransactionConfig,
): string[] => {
  const chunks: string[] = [];
  if (config.isolationLevel)
    chunks.push(`isolation level ${config.isolationLevel}`);
  if (config.accessMode) chunks.push(config.accessMode);
  if (config.deferrable !== undefined)
    chunks.push(config.deferrable ? "deferrable" : "not deferrable");
  const statements: string[] = [];
  if (chunks.length) statements.push(`set transaction ${chunks.join(" ")}`);
  if (config.snapshot !== undefined) {
    statements.push(
      dialect.sqlToQuery(
        sql`set transaction snapshot ${config.snapshot}`.inlineParams(),
      ).sql,
    );
  }
  return statements;
};

export class BunSQLEffectSession<
  TQueryResult extends PgQueryResultHKT,
  TRelations extends AnyRelations,
> extends PgEffectSession<BunSQLEffectQueryHKT, TQueryResult, TRelations> {
  static override readonly [entityKind]: string = "BunSQLEffectSession";

  constructor(
    private readonly client: SQL,
    dialect: PgDialect,
    protected readonly relations: TRelations,
    private readonly options: BunSQLEffectSessionOptions,
    /** Savepoint depth when this session is bound to a transaction's dedicated connection; undefined for the pool session. */
    private readonly txDepth?: number,
    /** Serializes sibling nested transactions on the shared reserved connection, mirroring @effect/sql's makeWithTransaction. */
    private readonly txSemaphore?: Semaphore.Semaphore,
  ) {
    super(dialect);
  }

  override prepareQuery<T extends PreparedQueryConfig = PreparedQueryConfig>(
    query: Query,
    mode: "arrays" | "objects" | "raw",
    _name: string | boolean,
    // oxlint-disable-next-line anti-slop/no-unknown-returns -- drizzle's session contract; the mapper is untyped upstream
    mapper?: (rows: unknown[]) => unknown,
    queryMetadata?: {
      type: "select" | "update" | "delete" | "insert";
      tables: string[];
    },
    cacheConfig?: WithCacheConfig,
  ): PgEffectPreparedQuery<T, BunSQLEffectQueryHKT> {
    const client = this.client;
    // failures become SqlError here and drizzle's own machinery wraps them in
    // EffectDrizzleQueryError (with query text + params), matching effect-postgres
    const executor = (params?: unknown[]) =>
      Effect.tryPromise({
        try: (signal) => {
          const q =
            mode === "arrays"
              ? client.unsafe<unknown>(query.sql, params).values()
              : client.unsafe<unknown>(query.sql, params);
          signal.addEventListener("abort", () => q.cancel(), { once: true });
          return q;
        },
        catch: (cause) =>
          new SqlError({
            reason: classifyPgError(
              cause,
              `Failed query: ${query.sql}`,
              "execute",
            ),
          }),
      });
    return new PgEffectPreparedQuery<T, BunSQLEffectQueryHKT>(
      executor,
      query,
      mapper,
      mode,
      this.options.logger,
      this.options.cache,
      queryMetadata,
      cacheConfig,
    );
  }

  override transaction<A, E, R>(
    transaction: (
      tx: BunSQLEffectTransaction<TQueryResult, TRelations>,
    ) => Effect.Effect<A, E, R>,
    config?: PgTransactionConfig,
  ): Effect.Effect<A, E | SqlError, R> {
    const dialect = this.dialect;
    const { relations, options } = this;

    // already on a transaction's dedicated connection: nest via savepoint
    if (this.txDepth !== undefined) {
      const depth = this.txDepth + 1;
      const name = `sp${depth}`;
      const session = new BunSQLEffectSession<TQueryResult, TRelations>(
        this.client,
        dialect,
        relations,
        options,
        depth,
        this.txSemaphore,
      );
      const tx = new BunSQLEffectTransaction<TQueryResult, TRelations>(
        dialect,
        session,
        relations,
        depth,
      );
      // concurrent sibling savepoints on one connection would interleave and
      // share names, so nested transactions serialize on the tx semaphore
      const nested = Effect.uninterruptibleMask((restore) =>
        Effect.flatMap(
          session.executeStatement(`savepoint ${name}`, "savepoint"),
          () =>
            Effect.onExit(
              Effect.gen(function* () {
                if (config !== undefined) {
                  for (const statement of transactionConfigStatements(
                    dialect,
                    config,
                  )) {
                    yield* session.executeStatement(
                      statement,
                      "setTransaction",
                    );
                  }
                }
                const result = yield* restore(transaction(tx));
                yield* session.executeStatement(
                  `release savepoint ${name}`,
                  "savepoint",
                );
                return result;
              }),
              (exit) =>
                Exit.isSuccess(exit)
                  ? Effect.void
                  : Effect.ignore(
                      session.executeStatement(
                        `rollback to savepoint ${name}`,
                        "savepoint",
                      ),
                    ),
            ),
        ),
      );
      return this.txSemaphore !== undefined
        ? Semaphore.withPermit(this.txSemaphore, nested)
        : nested;
    }

    // top-level: reserve a dedicated connection and run an explicit begin/commit/rollback
    const pool = this.client;
    return Effect.uninterruptibleMask((restore) =>
      Effect.flatMap(Semaphore.make(1), (semaphore) =>
        Effect.flatMap(
          Effect.tryPromise({
          try: () => pool.reserve(),
          catch: (cause) =>
            new SqlError({
              reason: classifyPgError(
                cause,
                "Failed to acquire connection for transaction",
                "acquireConnection",
              ),
            }),
        }),
        (reserved) => {
          let tainted = false;
          const session = new BunSQLEffectSession<TQueryResult, TRelations>(
            reserved,
            dialect,
            relations,
            options,
            0,
            semaphore,
          );
          const tx = new BunSQLEffectTransaction<TQueryResult, TRelations>(
            dialect,
            session,
            relations,
            0,
          );
          const body = Effect.flatMap(
            session.executeStatement("begin", "begin"),
            () =>
              Effect.onExit(
                Effect.gen(function* () {
                  if (config !== undefined) {
                    for (const statement of transactionConfigStatements(
                      dialect,
                      config,
                    )) {
                      yield* session.executeStatement(
                        statement,
                        "setTransaction",
                      );
                    }
                  }
                  const result = yield* restore(transaction(tx));
                  yield* session.executeStatement("commit", "commit");
                  return result;
                }),
                // rollback on failure and interruption; commit already ran on success
                (exit) =>
                  Exit.isSuccess(exit)
                    ? Effect.void
                    : Effect.catch(
                        session.executeStatement("rollback", "rollback"),
                        () =>
                          // a failed rollback may leave the connection inside an
                          // aborted transaction; pooling it would poison later
                          // queries, so it gets destroyed instead of released
                          Effect.sync(() => {
                            tainted = true;
                          }),
                      ),
              ),
          );
          return Effect.ensuring(
            body,
            Effect.suspend(() =>
              tainted
                ? Effect.promise(() => reserved.close({ timeout: 1 }))
                : Effect.sync(() => {
                    reserved.release();
                  }),
            ),
          );
        },
        ),
      ),
    );
  }

  private executeStatement(
    statement: string,
    operation: string,
  ): Effect.Effect<void, SqlError> {
    const client = this.client;
    return Effect.asVoid(
      Effect.tryPromise({
        try: () => client.unsafe(statement),
        catch: (cause) =>
          new SqlError({
            reason: classifyPgError(
              cause,
              `Failed to execute: ${statement}`,
              operation,
            ),
          }),
      }),
    );
  }
}

export class BunSQLEffectTransaction<
  TQueryResult extends PgQueryResultHKT,
  TRelations extends AnyRelations,
> extends PgEffectTransaction<BunSQLEffectQueryHKT, TQueryResult, TRelations> {
  static override readonly [entityKind]: string = "BunSQLEffectTransaction";

  override transaction<A, E, R>(
    transaction: (
      tx: PgEffectTransaction<BunSQLEffectQueryHKT, TQueryResult, TRelations>,
    ) => Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | SqlError, R> {
    return this._.session.transaction(transaction);
  }
}
