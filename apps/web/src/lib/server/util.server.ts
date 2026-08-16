import { DrizzleQueryError } from "drizzle-orm";

/**
 * Check if an error is a Postgres error with a specific code.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary predicate; caught errors are genuinely unknown
export function isPostgresError(error: unknown, code: string) {
  if (error instanceof DrizzleQueryError) {
    if (error.cause instanceof Bun.SQL.PostgresError) {
      if (error.cause.errno === code) {
        return true;
      }
    }
  }

  return false;
}
