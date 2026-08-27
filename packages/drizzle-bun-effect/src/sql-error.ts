import { SQL } from "bun";
import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  ConstraintError,
  DeadlockError,
  LockTimeoutError,
  SerializationError,
  type SqlErrorReason,
  SqlSyntaxError,
  StatementTimeoutError,
  UniqueViolation,
  UnknownError,
} from "effect/unstable/sql/SqlError";

const SQLSTATE = /^[0-9A-Z]{5}$/;

/**
 * Classifies a Bun SQL failure into the same SqlErrorReason taxonomy that
 * @effect/sql-pg's PgClient produces, so SqlError values from this driver are
 * interchangeable with the effect-postgres flavor's.
 *
 * Server errors carry their SQLSTATE in PostgresError.errno; Bun client-side
 * failures only have an ERR_POSTGRES_* code.
 */
export const classifyPgError = (
  cause: unknown,
  message: string,
  operation: string,
): SqlErrorReason => {
  const props = { cause, message, operation };
  if (!(cause instanceof SQL.PostgresError)) return new UnknownError(props);
  const state =
    cause.errno !== undefined && SQLSTATE.test(cause.errno)
      ? cause.errno
      : undefined;
  if (state !== undefined) {
    if (state.startsWith("08")) return new ConnectionError(props);
    if (state.startsWith("28")) return new AuthenticationError(props);
    if (state === "42501") return new AuthorizationError(props);
    if (state.startsWith("42")) return new SqlSyntaxError(props);
    if (state === "23505") {
      return new UniqueViolation({
        ...props,
        constraint: cause.constraint?.trim() || "unknown",
      });
    }
    if (state.startsWith("23")) return new ConstraintError(props);
    if (state === "40P01") return new DeadlockError(props);
    if (state === "40001") return new SerializationError(props);
    if (state === "55P03") return new LockTimeoutError(props);
    if (state === "57014") return new StatementTimeoutError(props);
    return new UnknownError(props);
  }
  const { code } = cause;
  if (
    code.startsWith("ERR_POSTGRES_CONNECTION") ||
    code.startsWith("ERR_POSTGRES_TLS") ||
    code === "ERR_POSTGRES_IDLE_TIMEOUT" ||
    code === "ERR_POSTGRES_LIFETIME_TIMEOUT"
  ) {
    return new ConnectionError(props);
  }
  if (
    code.includes("AUTHENTICATION") ||
    code.includes("SASL") ||
    code === "ERR_POSTGRES_INVALID_SERVER_KEY" ||
    code === "ERR_POSTGRES_INVALID_SERVER_SIGNATURE"
  ) {
    return new AuthenticationError(props);
  }
  if (code === "ERR_POSTGRES_SYNTAX_ERROR") return new SqlSyntaxError(props);
  return new UnknownError(props);
};
