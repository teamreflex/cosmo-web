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
