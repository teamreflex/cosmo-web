import { desc } from "drizzle-orm";
import { db } from "./db";
import { gravities } from "./db/schema";
import { fetchGravity, fetchPoll } from "./cosmo/gravity";
import type { ValidArtist } from "../universal/cosmo/common";
import { getProxiedToken } from "./handlers/withProxiedToken";
import { findPoll } from "../client/gravity/util";
import type { RevealedVote } from "../client/gravity/polygon/types";
import { remember } from "./cache";

/**
 * Fetch all gravities and group them by artist.
 */
export async function fetchGravities() {
  const data = await db
    .select()
    .from(gravities)
    .orderBy(desc(gravities.startDate));
  return Object.groupBy(data, (r) => r.artist);
}

/**
 * Fetch historical data for a Polygon gravity.
 * Cached for 30 days.
 */
export async function fetchPolygonGravity(artist: ValidArtist, id: number) {
  return await remember(
    `gravity-polygon:${artist}:${id}`,
    60 * 60 * 24 * 30, // 30 days
    async () => {
      // 1. get a cosmo token
      const { accessToken } = await getProxiedToken();

      // 2. fetch gravity from cosmo
      const gravity = await fetchGravity(artist, id);
      if (!gravity) {
        throw new GravityMissingError();
      }

      // 3. fetch poll details
      const poll = await fetchPoll(
        accessToken,
        artist,
        gravity.id,
        findPoll(gravity).poll.id
      );

      // prior to gravity 11, they used the cosmo poll ID on-chain instead of a separate ID
      const chainPollId = gravity.id <= 11 ? poll.id : poll.pollIdOnChain;

      // 4. fetch votes
      const votes = await db.query.polygonVotes.findMany({
        where: {
          contract: ADDRESSES[artist],
          pollId: chainPollId,
        },
        with: {
          cosmoAccount: {
            columns: {
              username: true,
            },
          },
        },
      });

      // 5. map votes
      const revealedVotes = votes
        .map(
          (vote) =>
            ({
              pollId: Number(vote.pollId),
              voter: vote.address,
              comoAmount: vote.amount,
              candidateId: vote.candidateId!,
              blockNumber: vote.blockNumber,
              username: vote.cosmoAccount?.username,
              hash: vote.hash,
            } satisfies RevealedVote)
        )
        .filter((vote) => vote.candidateId !== null)
        .sort((a, b) => b.comoAmount - a.comoAmount);

      // 6. aggregate como by candidate
      const comoByCandidate = revealedVotes.reduce((acc, vote) => {
        const id = vote.candidateId.toString();
        acc[id] = (acc[id] ?? 0) + vote.comoAmount;
        return acc;
      }, {} as Record<string, number>);

      // 7. calculate total como used
      const totalComoUsed = revealedVotes.reduce((acc, vote) => {
        return acc + vote.comoAmount;
      }, 0);

      return { poll, revealedVotes, comoByCandidate, totalComoUsed };
    }
  );
}

/**
 * Fetch a gravity, and if it's in the past, cache it for 30 days.
 */
export async function fetchCachedGravity(
  artist: ValidArtist,
  id: number,
  isPast: boolean
) {
  if (isPast) {
    return await remember(
      `gravity:${artist}:${id}`,
      60 * 60 * 24 * 30, // 30 days
      () => fetchGravity(artist, id)
    );
  }

  return await fetchGravity(artist, id);
}

/**
 * Fetch a poll, and if it's in the past, cache it for 30 days.
 */
export async function fetchCachedPoll(
  artist: ValidArtist,
  gravityId: number,
  pollId: number,
  isPast: boolean
) {
  if (isPast) {
    return await remember(
      `poll:${artist}:${gravityId}:${pollId}`,
      60 * 60 * 24 * 30, // 30 days
      async () => {
        const { accessToken } = await getProxiedToken();
        return await fetchPoll(accessToken, artist, gravityId, pollId);
      }
    );
  }

  const { accessToken } = await getProxiedToken();
  return await fetchPoll(accessToken, artist, gravityId, pollId);
}

const ADDRESSES: Record<string, string> = {
  triples: "0xc3e5ad11ae2f00c740e74b81f134426a3331d950",
  artms: "0x8466e6e218f0fe438ac8f403f684451d20e59ee3",
};

class GravityError extends Error {}
class GravityMissingError extends GravityError {
  message = "Gravity not found";
}
