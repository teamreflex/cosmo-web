import type {
  CosmoLinkEvent,
  CosmoLinkReason,
} from "@apollo/database/web/types";

/**
 * One link or unlink of a COSMO account. The user is named by their Apollo
 * username, because their current COSMO account may not be the one the row
 * describes. The username is null once their account is deleted.
 */
export type CosmoLinkHistoryEntry = {
  id: number;
  createdAt: Date;
  event: CosmoLinkEvent;
  cosmo: { username: string; address: string };
  user: { id: string; username: string | null };
  reason: CosmoLinkReason;
};
