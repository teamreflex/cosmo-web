import type { Role } from "./index";

/**
 * Redis channel for staff changes to an account and for ended sessions.
 * apps/web publishes on it and apps/chat subscribes, closing a user's sockets
 * on `disconnect`, `banned` and `role-changed`.
 */
export const USER_EVENTS_CHANNEL = "user-events";

export type UserEvent =
  | { type: "banned"; userId: string; expiresAt: string | null }
  | { type: "unbanned"; userId: string }
  | { type: "role-changed"; userId: string; role: Role }
  | { type: "disconnect"; userId: string };
