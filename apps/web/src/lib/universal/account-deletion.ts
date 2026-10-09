import * as z from "zod";
import type { AccountErrorCode } from "./errors/accounts";
import type { DeletionProof } from "./schema/account";

/**
 * A live trade that keeps its participant from deleting their account. A null
 * counterparty is a deleted user.
 */
export type LiveTradeSummary = {
  id: string;
  kind: "trade" | "purchase" | "sale";
  counterparty: string | null;
  state: { kind: "deadline"; at: Date } | { kind: "disputed" };
};

export type DeletionBlocker = {
  kind: "live-trades";
  trades: [LiveTradeSummary, ...LiveTradeSummary[]];
};

export type DeletionCheck =
  | { status: "allowed" }
  | { status: "blocked"; blockers: [DeletionBlocker, ...DeletionBlocker[]] };

export type DeletionBlocked = Extract<DeletionCheck, { status: "blocked" }>;

export type RequestDeletionResult = DeletionBlocked | { status: "sent" };

export type DeleteAccountResult = DeletionBlocked | { status: "deleted" };

/**
 * What the Delete dialog offers once nothing blocks the deletion. An account
 * with a deliverable email is sent a confirmation link. One without deletes
 * straight away on a fresh session, or is told to sign in again first.
 */
export type DeletionStep = "send-email" | "delete" | "sign-in-again";

export type DeletionAvailability =
  | DeletionBlocked
  | { status: "allowed"; step: DeletionStep };

/**
 * How long after signing in a session can delete an account that has no
 * deliverable email.
 */
export const FRESH_SESSION_MINUTES = 10;

/**
 * Whether the session was signed in recently enough to prove a deletion. It
 * counts from the sign-in, so a session that keeps being refreshed still goes
 * stale.
 */
export function isFreshSession(createdAt: Date, now: Date) {
  return now.getTime() - createdAt.getTime() < FRESH_SESSION_MINUTES * 60_000;
}

/**
 * X sign-ins without a confirmed email store the X username as the email,
 * which can't receive the confirmation link.
 */
export function hasDeliverableEmail(email: string) {
  return z.email().safeParse(email).success;
}

export function deletionStep(
  email: string,
  sessionCreatedAt: Date,
  now: Date,
): DeletionStep {
  if (hasDeliverableEmail(email)) {
    return "send-email";
  }
  return isFreshSession(sessionCreatedAt, now) ? "delete" : "sign-in-again";
}

/**
 * Why the proof can't delete an account at this step, or null when it can.
 * An emailed token is checked when it is consumed. A fresh session only proves
 * an account without a deliverable email, so accounts with one keep the email
 * flow.
 */
export function deletionProofRefusal(
  proof: DeletionProof,
  step: DeletionStep,
): AccountErrorCode | null {
  switch (proof.kind) {
    case "email":
      return null;
    case "fresh-session":
      switch (step) {
        case "delete":
          return null;
        case "send-email":
          return "account_deletion_email_required";
        case "sign-in-again":
          return "account_deletion_session_stale";
      }
  }
}

/**
 * Combines each blocker check's result: deletion is allowed only when none
 * returned a blocker.
 */
export function toDeletionCheck(
  results: readonly (DeletionBlocker | null)[],
): DeletionCheck {
  const [first, ...rest] = results.filter((result) => result !== null);
  return first === undefined
    ? { status: "allowed" }
    : { status: "blocked", blockers: [first, ...rest] };
}

/**
 * How many things the blockers list, for the blocked description's plural.
 */
export function deletionBlockerCount(blockers: readonly DeletionBlocker[]) {
  return blockers.reduce((count, blocker) => {
    switch (blocker.kind) {
      case "live-trades":
        return count + blocker.trades.length;
      default:
        blocker.kind satisfies never;
        return count;
    }
  }, 0);
}

/**
 * The email an anonymised account keeps. It is unique per user, and its domain
 * has no dot, so `z.email()`, which Better Auth checks sign-in, sign-up and
 * email changes with, rejects it.
 */
export function tombstoneEmail(userId: string) {
  return `deleted+${userId}@invalid`;
}
