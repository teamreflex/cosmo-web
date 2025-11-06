import { notFound } from "@tanstack/react-router";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";
import z from "zod";
import { isBefore } from "date-fns";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { isEqual } from "@apollo/util";
import { findPoll } from "../client/gravity/util";
import { GravityNotSupportedError } from "../universal/gravity";
import { db } from "./db";
import { fetchGravity, fetchPoll } from "./cosmo/gravity";
import { getProxiedToken } from "./proxied-token";
import { cacheHeaders, remember } from "./cache";
import { indexer } from "./db/indexer";
import { gravities } from "./db/schema";
import type { GravityVote } from "../universal/gravity";
import type { RevealedVote } from "../client/gravity/polygon/types";
import type { ValidArtist } from "../universal/cosmo/common";
import { $fetchArtists } from "@/lib/server/artists";

/**
 * Fetch full gravity details.
 */
export const $fetchGravityDetails = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artist: z.string(),
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    // get artists
    const artists = await $fetchArtists();

    // perform quick lookup from database
    const info = await db.query.gravities.findFirst({
      where: {
        artist: data.artist,
        cosmoId: data.id,
      },
    });

    // doesn't exist in database, 404
    if (!info) {
      throw notFound();
    }

    // we don't support combination polls yet
    if (info.pollType !== "single-poll") {
      throw new GravityNotSupportedError(
        "Combination poll support is not available yet.",
      );
    }

    const isPast = isBefore(info.endDate, Date.now());
    const isPolygon = isBefore(info.endDate, "2025-04-18");
    const artist = artists.find((a) => isEqual(a.id, data.artist));
    if (!artist) {
      throw notFound();
    }

    // fetch the full gravity from cosmo or cache, depending on timing
    const gravity = await fetchCachedGravity(artist.id, info.cosmoId, isPast);
    if (!gravity) {
      throw notFound();
    }

    // pull the correct poll from the gravity
    const maybePoll = findPoll(gravity);
    if (!maybePoll) {
      throw notFound();
    }

    return {
      artist,
      gravity,
      isPolygon,
      poll: maybePoll.poll,
    };
  });

/**
 * Fetch all gravities and group them by artist.
 */
export const $fetchGravities = createServerFn({ method: "GET" }).handler(
  async () => {
    const data = await db
      .select()
      .from(gravities)
      .orderBy(desc(gravities.startDate));
    return Object.groupBy(data, (r) => r.artist);
  },
);

/**
 * Fetch historical data for a Polygon gravity.
 * Cached for 30 days.
 */
export const $fetchPolygonGravity = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artist: z.string(),
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    // cache this server function response for 30 days
    setResponseHeaders(cacheHeaders({ cdn: 60 * 60 * 24 * 30 })); // 30 days

    return await remember(
      `gravity-polygon:${data.artist}:${data.id}`,
      60 * 60 * 24 * 30, // 30 days
      async () => {
        // 1. get a cosmo token
        const { accessToken } = await getProxiedToken();

        // 2. fetch gravity from cosmo
        const gravity = await fetchGravity(data.artist as ValidArtist, data.id);
        if (!gravity) {
          throw notFound();
        }

        // 3. fetch poll details
        const gravityPoll = findPoll(gravity);
        if (!gravityPoll) {
          throw notFound();
        }

        const poll = await fetchPoll(
          accessToken,
          data.artist as ValidArtist,
          gravity.id,
          gravityPoll.poll.id,
        );

        // prior to gravity 11, they used the cosmo poll ID on-chain instead of a separate ID
        const chainPollId = gravity.id <= 11 ? poll.id : poll.pollIdOnChain;

        // 4. fetch votes
        const votes = await db.query.polygonVotes.findMany({
          where: {
            contract: ADDRESSES[data.artist],
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
          .filter((vote) => vote.candidateId !== null)
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
              }) satisfies RevealedVote,
          )
          .sort((a, b) => b.comoAmount - a.comoAmount);

        // 6. aggregate como by candidate
        const comoByCandidate = revealedVotes.reduce(
          (acc, vote) => {
            const candidateId = vote.candidateId.toString();
            acc[candidateId] = (acc[candidateId] ?? 0) + vote.comoAmount;
            return acc;
          },
          {} as Record<string, number>,
        );

        // 7. calculate total como used
        const totalComoUsed = revealedVotes.reduce((acc, vote) => {
          return acc + vote.comoAmount;
        }, 0);

        return { poll, revealedVotes, comoByCandidate, totalComoUsed };
      },
    );
  });

/**
 * Fetch a gravity, and if it's in the past, cache it for 30 days.
 */
export const fetchCachedGravity = createServerOnlyFn(
  async (artistId: ValidArtist, id: number, isPast: boolean) => {
    if (isPast) {
      return await remember(
        `gravity:${id}`,
        60 * 60 * 24 * 30, // 30 days
        () => fetchGravity(artistId, id),
      );
    }

    return await fetchGravity(artistId, id);
  },
);

/**
 * Fetch a poll, and if it's in the past, cache it for 30 days.
 */
export const $fetchCachedPoll = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artist: z.string(),
      gravityId: z.number(),
      pollId: z.number(),
      isPast: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const fn = async () => {
      const { accessToken } = await getProxiedToken();
      return await fetchPoll(
        accessToken,
        data.artist as ValidArtist,
        data.gravityId,
        data.pollId,
      );
    };

    // check the database for the end date if not provided
    if (data.isPast === undefined) {
      const info = await db.query.gravities.findFirst({
        where: {
          artist: data.artist,
          cosmoId: data.gravityId,
        },
        columns: {
          endDate: true,
        },
      });
      if (!info) {
        throw notFound();
      }
      data.isPast = isBefore(info.endDate, Date.now());
    }

    // if the poll is in the past, cache it for 30 days
    if (data.isPast) {
      return await remember(
        `poll:${data.artist}:${data.gravityId}:${data.pollId}`,
        60 * 60 * 24 * 30, // 30 days
        fn,
      );
    }

    // otherwise fetch the poll from cosmo
    return await fn();
  });

/**
 * Fetch votes from the indexer.
 */
export const fetchAbstractVotes = createServerOnlyFn(
  async (pollId: number): Promise<GravityVote[]> => {
    const votes = await indexer.query.votes.findMany({
      where: {
        pollId,
      },
    });

    return votes.map((vote) => ({
      ...vote,
      amount: Number(vote.amount),
    }));
  },
);

const ADDRESSES: Record<string, string> = {
  triples: "0xc3e5ad11ae2f00c740e74b81f134426a3331d950",
  artms: "0x8466e6e218f0fe438ac8f403f684451d20e59ee3",
};
