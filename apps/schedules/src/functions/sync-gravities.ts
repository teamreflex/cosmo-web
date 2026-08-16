import { DatabaseWeb } from "@/db";
import { ProxiedToken } from "@/proxied-token";
import { fetchArtist, fetchArtists } from "@apollo/cosmo/effect/artists";
import { fetchGravities, fetchPoll } from "@apollo/cosmo/effect/gravity";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import {
  gravities,
  gravityPollCandidates,
  gravityPolls,
} from "@apollo/database/web/schema";
import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Sync gravities from COSMO API to database.
 */
export const syncGravitiesTask = {
  name: "sync-gravities",
  cron: "*/30 * * * *",
  effect: Effect.gen(function* () {
    const proxiedToken = yield* ProxiedToken;

    const { accessToken } = yield* proxiedToken.get;

    yield* Effect.logInfo("Fetching artists...");
    const artistList = yield* fetchArtists(accessToken);

    // fetching the full artist record to use the .id field for consistency
    const artists = yield* Effect.all(
      artistList.map((artist) => fetchArtist(accessToken, artist.name)),
      { concurrency: 5 },
    );

    yield* Effect.logInfo(`Processing gravities for ${artists.length} artists`);

    yield* Effect.all(
      artists.map((artist) =>
        processGravities(accessToken, artist).pipe(
          Effect.catchAll((error) =>
            Effect.logError(
              `Failed to process gravities for ${artist.title}: ${error.message}`,
            ),
          ),
        ),
      ),
      { concurrency: 5 },
    );

    yield* Effect.logInfo("Gravity sync completed");
  }),
} satisfies ScheduledTask;

/**
 * Process the gravities for a given artist.
 */
const processGravities = Effect.fn(function* (
  token: string,
  artist: CosmoArtistWithMembersBFF,
) {
  const db = yield* DatabaseWeb;

  yield* Effect.logInfo(`Loading gravities for ${artist.title}`);

  const list = yield* fetchGravities(token, artist.id);

  const remoteGravities = [
    ...list.ongoing,
    ...list.upcoming,
    ...list.past,
  ].sort(
    (a, b) =>
      new Date(a.entireStartDate).getTime() -
      new Date(b.entireStartDate).getTime(),
  );

  const storedGravities = yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          cosmoId: gravities.cosmoId,
        })
        .from(gravities)
        .where(eq(gravities.artist, artist.id)),
    catch: (cause) =>
      new QueryStoredGravitiesError({ artist: artist.title, cause }),
  });

  const notStoredGravities = remoteGravities.filter(
    (gravity) => !storedGravities.some((g) => g.cosmoId === gravity.id),
  );

  // gravities are stored sequentially; a failed poll fetch aborts the artist,
  // while a failed transaction only skips that gravity
  yield* Effect.forEach(notStoredGravities, (gravity) =>
    Effect.gen(function* () {
      const polls = yield* Effect.forEach(
        gravity.polls,
        (poll) => fetchPoll(token, poll.id),
        { concurrency: "unbounded" },
      );

      yield* Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            // store gravity
            await tx.insert(gravities).values({
              artist: artist.id,
              cosmoId: gravity.id,
              title: cleanString(gravity.title),
              description: cleanString(gravity.description),
              image: gravity.bannerImageUrl,
              gravityType: gravity.type,
              pollType: gravity.pollType,
              startDate: new Date(gravity.entireStartDate),
              endDate: new Date(gravity.entireEndDate),
            });

            // store polls
            await tx.insert(gravityPolls).values(
              polls.map((poll) => ({
                cosmoGravityId: gravity.id,
                cosmoId: poll.id,
                pollIdOnChain: poll.pollIdOnChain,
                title: cleanString(poll.title),
                startDate: new Date(poll.startDate),
                endDate: new Date(poll.endDate),
              })),
            );

            // store candidates
            const candidates = polls.flatMap((poll) =>
              poll.choices.map((choice, index) => ({
                cosmoGravityPollId: poll.id,
                candidateId: index,
                cosmoId: choice.id,
                // should probably handle combination polls
                title: "title" in choice ? choice.title : choice.id,
                image: choice.txImageUrl,
              })),
            );
            await tx.insert(gravityPollCandidates).values(candidates);
          }),
        catch: (cause) =>
          new StoreGravitiesError({ artist: artist.title, cause }),
      }).pipe(
        Effect.catchAll((error) =>
          Effect.logError(`Error storing gravity ${gravity.id}`, error),
        ),
      );

      yield* Effect.logInfo(`Stored ${cleanString(gravity.title)}`);
    }),
  );

  yield* Effect.logInfo(
    `Processed ${notStoredGravities.length} gravities for ${artist.title}`,
  );
});

/**
 * Clean up any inconsistent newline usage in titles/descriptions.
 */
function cleanString(str: string) {
  return str.replaceAll("\n", " ").replaceAll("  ", " ");
}

/**
 * Failed to query stored gravities from database.
 */
export class QueryStoredGravitiesError extends Data.TaggedError(
  "QueryStoredGravitiesError",
)<{
  readonly artist: string;
  readonly cause: unknown;
}> {}

/**
 * Failed to store gravities in database.
 */
export class StoreGravitiesError extends Data.TaggedError(
  "StoreGravitiesError",
)<{
  readonly artist: string;
  readonly cause: unknown;
}> {}
