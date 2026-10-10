import type { StaffUser } from "@/lib/universal/staff-users";
import type { CosmoLinkEvent } from "@apollo/database/web/types";

/**
 * One link or unlink of a COSMO account. The user is named by their Apollo
 * username, because their current COSMO account may not be the one the row
 * describes. The username is null once their account is deleted, and so is a
 * staff move's staff member.
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
    | { kind: "staff-move"; staff: StaffUser | null };
};
