import { DrizzleQueryError } from "drizzle-orm";

/**
 * Check if an error is a Postgres error with a specific code, and, when one
 * is given, raised by a specific constraint or index.
 */
export function isPostgresError(
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary predicate; caught errors are genuinely unknown
  error: unknown,
  code: string,
  constraint?: string,
) {
  return (
    error instanceof DrizzleQueryError &&
    error.cause instanceof Bun.SQL.PostgresError &&
    error.cause.errno === code &&
    (constraint === undefined || error.cause.constraint === constraint)
  );
}

/**
 * A LIKE or ILIKE pattern matching values that start with `query`, with the
 * query's wildcards escaped so they match literally.
 */
export function prefixPattern(query: string) {
  return `${query.replace(/[\\%_]/g, "\\$&")}%`;
}
