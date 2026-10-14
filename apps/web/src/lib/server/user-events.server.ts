import { redis } from "@/lib/server/cache.server";
import { USER_EVENTS_CHANNEL } from "@apollo/auth/events";
import type { UserEvent } from "@apollo/auth/events";

/**
 * Announce a staff change to an account, or an ended session, on the
 * `user-events` channel.
 */
export async function publishUserEvent(event: UserEvent) {
  await redis.publish(USER_EVENTS_CHANNEL, JSON.stringify(event));
}
