import { $fetchArtists } from "@/lib/server/artists";
import { fetchGravity, fetchPoll } from "@apollo/cosmo/server/gravity";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { gravities, gravityPolls } from "@apollo/database/web/schema";
import { notFound } from "@tanstack/react-router";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { isBefore } from "date-fns";
import { and, asc, desc, eq, getColumns, gte, inArray, lt } from "drizzle-orm";
import * as z from "zod";
import type { RevealedVote } from "../client/gravity/types";
import { findPoll } from "../client/gravity/util";
import { GravityNotSupportedError } from "../universal/gravity";
import type { GravityVote } from "../universal/gravity";
import { cacheHeaders, remember } from "./cache";
import { db } from "./db";
import { indexer } from "./db/indexer";
import { getProxiedToken } from "./proxied-token";

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
    const { artists } = await $fetchArtists();

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
    const artist = artists[data.artist.toLowerCase()];
    if (!artist) {
      throw notFound();
    }

    // fetch the full gravity from cosmo or cache, depending on timing
    const gravity = await fetchCachedGravity(info.cosmoId, isPast);
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
 * Subquery to get the latest poll for each gravity.
 */
function getLatestPollSubquery() {
  return db
    .selectDistinctOn([gravityPolls.cosmoGravityId], {
      cosmoGravityId: gravityPolls.cosmoGravityId,
      pollStartDate: gravityPolls.startDate,
      pollEndDate: gravityPolls.endDate,
    })
    .from(gravityPolls)
    .orderBy(gravityPolls.cosmoGravityId, desc(gravityPolls.cosmoId))
    .as("latest_poll");
}

/**
 * Fetch active gravities (endDate in the future) with their last poll's dates.
 */
export const $fetchActiveGravities = createServerFn({ method: "GET" })
  .inputValidator(z.object({ artists: z.array(z.string()).optional() }))
  .handler(async ({ data }) => {
    const latestPoll = getLatestPollSubquery();
    const now = new Date();

    const conditions = [gte(gravities.endDate, now)];
    if (data.artists?.length) {
      conditions.push(inArray(gravities.artist, data.artists));
    }

    return db
      .select({
        ...getColumns(gravities),
        pollStartDate: latestPoll.pollStartDate,
        pollEndDate: latestPoll.pollEndDate,
      })
      .from(gravities)
      .leftJoin(latestPoll, eq(gravities.cosmoId, latestPoll.cosmoGravityId))
      .where(and(...conditions))
      .orderBy(asc(gravities.startDate));
  });

/**
 * Fetch paginated past gravities (endDate in the past) with their last poll's dates.
 */
export const $fetchPaginatedGravities = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artists: z.array(z.string()).optional(),
      cursor: z.iso.datetime().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const PER_PAGE = 24;
    const latestPoll = getLatestPollSubquery();
    const now = new Date();

    const conditions = [lt(gravities.endDate, now)];
    if (data.artists?.length) {
      conditions.push(inArray(gravities.artist, data.artists));
    }
    if (data.cursor) {
      conditions.push(lt(gravities.startDate, new Date(data.cursor)));
    }

    const results = await db
      .select({
        ...getColumns(gravities),
        pollStartDate: latestPoll.pollStartDate,
        pollEndDate: latestPoll.pollEndDate,
      })
      .from(gravities)
      .leftJoin(latestPoll, eq(gravities.cosmoId, latestPoll.cosmoGravityId))
      .where(and(...conditions))
      .orderBy(desc(gravities.startDate))
      .limit(PER_PAGE);

    const hasNext = results.length === PER_PAGE;
    const lastGravity = results[results.length - 1];
    const nextStartAfter = hasNext
      ? lastGravity?.startDate.toISOString()
      : undefined;

    return {
      gravities: results,
      nextStartAfter,
    };
  });

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
    const cacheKey = `gravity-polygon:${data.artist}:${data.id}`;

    // cache this server function response for 30 days
    setResponseHeaders(
      new Headers(
        cacheHeaders({ cdn: 60 * 60 * 24 * 30, tags: ["gravity", cacheKey] }),
      ),
    );

    return await remember(
      cacheKey,
      60 * 60 * 24 * 30, // 30 days
      async () => {
        // 1. get a cosmo token
        const { accessToken } = await getProxiedToken();

        // 2. fetch gravity from cosmo
        const gravity = await fetchGravity(accessToken, data.id);
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
  async (id: number, isPast: boolean) => {
    async function fn(id: number) {
      const { accessToken } = await getProxiedToken();
      return await fetchGravity(accessToken, id);
    }

    if (isPast) {
      return await remember(
        `gravity:${id}`,
        60 * 60 * 24 * 30, // 30 days
        () => fn(id),
      );
    }

    return await fn(id);
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
  async (pollId: number): Promise<Omit<GravityVote, "username">[]> => {
    const votes = await indexer.query.votes.findMany({
      columns: {
        logIndex: false,
        tokenId: false,
        hash: false,
        pollId: false,
      },
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

/**
 * Fetch revealed votes (candidateId != null) from the indexer.
 * Cursor-based for incremental fetching during reveal polling.
 */
export const $fetchRevealedVotes = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      pollId: z.number(),
      cursor: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const votes = await indexer.query.votes.findMany({
      columns: {
        id: true,
        candidateId: true,
        blockNumber: true,
        amount: true,
      },
      where: {
        pollId: data.pollId,
        candidateId: { isNotNull: true },
        ...(data.cursor !== undefined && {
          blockNumber: { gt: data.cursor },
        }),
      },
      orderBy: {
        blockNumber: "asc",
      },
    });

    // if there's new reveals, return the highest block number, otherwise return the current cursor
    const nextCursor =
      votes.length > 0 ? votes[votes.length - 1]!.blockNumber : data.cursor;

    return {
      votes: votes.map((v) => ({
        id: v.id,
        candidateId: v.candidateId!,
        amount: v.amount,
      })),
      nextCursor,
    };
  });

const ADDRESSES: Record<string, string> = {
  triples: "0xc3e5ad11ae2f00c740e74b81f134426a3331d950",
  artms: "0x8466e6e218f0fe438ac8f403f684451d20e59ee3",
};
