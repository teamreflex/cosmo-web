import type { CosmoLinkEvent } from "@apollo/database/web/types";

/**
 * One link or unlink of a COSMO account. The user's username is null once
 * their account is deleted, and so is a staff move's staff member.
 */
export type CosmoLinkHistoryEntry = {
  id: number;
  createdAt: Date;
  event: CosmoLinkEvent;
  cosmo: { username: string; address: string };
  user: { id: string; username: string | null };
  reason:
    | { kind: "verified" }
    | { kind: "account-deleted" }
    | { kind: "staff-move"; staff: string | null };
};
