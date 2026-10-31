import * as z from "zod";
import { redis } from "./cache.server";

/**
 * How many users each market holder can invite while the market is gated.
 */
export const MARKET_INVITE_LIMIT = 3;

/**
 * The market launches before this, so every invite set expires on its own
 * instead of needing a cleanup step. Invites close at the same moment,
 * because an expired set would read as none used.
 */
const MARKET_INVITES_CLOSE_AT = Date.UTC(2027, 0, 1);

/**
 * The ids of the users an inviter has made testers. A missing key means no
 * invites used.
 */
function invitesKey(inviterId: string): string {
  return `market-invites:${inviterId}`;
}

/**
 * Checks the limit and adds the invitee in one step, so parallel invites
 * can't both take the last slot.
 */
const RESERVE_SCRIPT = `
if redis.call("SISMEMBER", KEYS[1], ARGV[1]) == 1 then return "already-invited" end
if redis.call("SCARD", KEYS[1]) >= tonumber(ARGV[2]) then return "exhausted" end
redis.call("SADD", KEYS[1], ARGV[1])
redis.call("EXPIREAT", KEYS[1], ARGV[3])
return "reserved"
`;

const reservationSchema = z.enum(["reserved", "already-invited", "exhausted"]);

export type InviteReservation = z.infer<typeof reservationSchema>;

/**
 * Takes one of the inviter's slots for the invitee. "already-invited" takes
 * nothing, so only a "reserved" slot is released again.
 */
export async function reserveInvite(
  inviterId: string,
  inviteeId: string,
): Promise<InviteReservation> {
  if (Date.now() >= MARKET_INVITES_CLOSE_AT) {
    return "exhausted";
  }
  return reservationSchema.parse(
    await redis.send("EVAL", [
      RESERVE_SCRIPT,
      "1",
      invitesKey(inviterId),
      inviteeId,
      String(MARKET_INVITE_LIMIT),
      String(MARKET_INVITES_CLOSE_AT / 1000),
    ]),
  );
}

export async function releaseInvite(
  inviterId: string,
  inviteeId: string,
): Promise<void> {
  await redis.srem(invitesKey(inviterId), inviteeId);
}

export async function countInvitesLeft(inviterId: string): Promise<number> {
  if (Date.now() >= MARKET_INVITES_CLOSE_AT) {
    return 0;
  }
  return Math.max(
    0,
    MARKET_INVITE_LIMIT - (await redis.scard(invitesKey(inviterId))),
  );
}
