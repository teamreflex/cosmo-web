import type { Reveal } from "@/lib/client/gravity/abstract/types";
import { findPoll } from "@/lib/client/gravity/util";
import { remember } from "@/lib/server/cache.server";
import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { toIso } from "@/lib/server/gravity.server";
import { getProxiedToken } from "@/lib/server/proxied-token.server";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { getClientIp, getRequestSignal } from "@/lib/server/request.server";
import { CosmoApiError } from "@apollo/cosmo/errors";
import { runCosmo } from "@apollo/cosmo/runtime";
import { GravitySchema, PollChoicesSchema } from "@apollo/cosmo/schema/gravity";
import { fetchGravity, fetchPoll } from "@apollo/cosmo/server/gravity";
import { gravities, gravityPolls } from "@apollo/database/web/schema";
import { addr } from "@apollo/util";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { isBefore } from "date-fns";
import { and, asc, desc, eq, getColumns, gte, inArray, lt } from "drizzle-orm";
import * as z from "zod";
import { $fetchArtists } from "./artists";

/**
 * Fetch full gravity details.
 */
export const $fetchGravityDetails = createServerFn({ method: "GET" })
  .validator(
    z.object({
      artist: z.string(),
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const signal = getRequestSignal();
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

    const isPast = isBefore(info.endDate, Date.now());
    const artist = artists[data.artist.toLowerCase()];
    if (!artist) {
      throw notFound();
    }

    // fetch the full gravity from cosmo or cache, depending on timing
    const gravity = await fetchCachedGravity(info.cosmoId, isPast, signal);

    // pull the correct poll from the gravity
    const maybePoll = findPoll(gravity);
    if (!maybePoll) {
      throw notFound();
    }

    // poll list for the day tabs. candidates are fetched per poll on demand,
    // as each one costs a COSMO request
    const polls = await db.query.gravityPolls.findMany({
      where: {
        cosmoGravityId: info.cosmoId,
      },
      columns: {
        cosmoId: true,
        title: true,
        startDate: true,
        endDate: true,
      },
      orderBy: {
        cosmoId: "asc",
      },
    });

    return {
      artist,
      gravity,
      polls,
      defaultPollId: maybePoll.poll.id,
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
  .validator(z.object({ artists: z.array(z.string()).optional() }))
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
  .validator(
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
 * Fetch a gravity, and if it's in the past, cache it for 30 days.
 */
async function fetchCachedGravity(
  id: number,
  isPast: boolean,
  signal?: AbortSignal,
) {
  async function fn(id: number) {
    const { accessToken } = await getProxiedToken(signal);
    try {
      return await runCosmo(fetchGravity(accessToken, id), signal);
    } catch (err) {
      // missing from COSMO is a 404 page; transient failures surface and are never cached
      if (err instanceof CosmoApiError && err.status === 404) {
        throw notFound();
      }
      throw err;
    }
  }

  if (!isPast) {
    return await fn(id);
  }

  return await remember(
    `gravity:${id}`,
    60 * 60 * 24 * 30, // 30 days
    () => fn(id),
    GravitySchema,
  );
}

/**
 * Fetch a poll, and if it's in the past, cache it for 30 days.
 */
export const $fetchCachedPoll = createServerFn({ method: "GET" })
  .validator(
    z.object({
      artist: z.string(),
      gravityId: z.number(),
      pollId: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const signal = getRequestSignal();
    const fn = async () => {
      const { accessToken } = await getProxiedToken(signal);
      return await runCosmo(fetchPoll(accessToken, data.pollId), signal);
    };

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

    // if the poll is in the past, cache it for 30 days
    if (isBefore(info.endDate, Date.now())) {
      return await remember(
        `poll:${data.artist}:${data.gravityId}:${data.pollId}`,
        60 * 60 * 24 * 30, // 30 days
        fn,
        PollChoicesSchema,
      );
    }

    // otherwise fetch the poll from cosmo
    return await fn();
  });

/**
 * Fetch revealed votes (candidateId != null) from the indexer.
 * Cursor-based for incremental fetching during reveal polling.
 */
export const $fetchRevealedVotes = createServerFn({ method: "GET" })
  .validator(
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
        createdAt: true,
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
    const nextCursor = votes.at(-1)?.blockNumber ?? data.cursor;

    return {
      votes: votes.flatMap((vote) =>
        vote.candidateId === null
          ? []
          : [
              {
                id: vote.id,
                candidateId: vote.candidateId,
                amount: vote.amount,
                createdAt: toIso(vote.createdAt),
              } satisfies Reveal,
            ],
      ),
      nextCursor,
    };
  });

/**
 * Fetch the 50 most recent votes for a poll, with usernames where known.
 * Candidate picks stay hidden until reveals begin, so only timing and amounts
 * are returned. Cached briefly so polling clients share one query.
 */
export const $fetchRecentVotes = createServerFn({ method: "GET" })
  .validator(z.object({ pollId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await consumeRateLimit({
      key: `gravity-recent-votes:${getClientIp()}`,
      limit: 30,
      window: "1 minute",
    });

    return await remember(
      `gravity-recent-votes:${data.pollId}`,
      30,
      async () => {
        const votes = await indexer.query.votes.findMany({
          columns: {
            id: true,
            from: true,
            createdAt: true,
            amount: true,
          },
          where: {
            pollId: data.pollId,
          },
          orderBy: {
            createdAt: "desc",
          },
          limit: 50,
        });

        const addressMap = await fetchKnownAddresses(
          votes.map((vote) => addr(vote.from)),
        );

        return votes.map((vote) => ({
          id: vote.id,
          address: vote.from,
          createdAt: toIso(vote.createdAt),
          amount: vote.amount,
          username: addressMap.get(addr(vote.from))?.username,
        }));
      },
    );
  });
