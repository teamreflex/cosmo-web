import type { Role } from "./index";

/**
 * Redis channel for account changes made by staff. apps/web publishes on it
 * and apps/chat will subscribe.
 */
export const USER_EVENTS_CHANNEL = "user-events";

export type UserEvent =
  | { type: "banned"; userId: string; expiresAt: string | null }
  | { type: "unbanned"; userId: string }
  | { type: "role-changed"; userId: string; role: Role };
