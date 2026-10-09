import type { CosmoLinkEvent } from "@apollo/database/web/types";

/**
 * A COSMO account whose link has changed, as the history search finds it.
 */
export type CosmoLinkHistoryAccount = {
  id: number;
  address: string;
  username: string;
};

/**
 * One link or unlink of a COSMO account. The user's username is null once
 * their account is deleted, and so is a staff move's staff member.
 */
export type CosmoLinkHistoryEntry = {
  id: number;
  createdAt: Date;
  event: CosmoLinkEvent;
  user: { id: string; username: string | null };
  reason:
    | { kind: "verified" }
    | { kind: "account-deleted" }
    | { kind: "staff-move"; staff: string | null };
};
