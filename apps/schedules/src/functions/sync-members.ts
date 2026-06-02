import { DatabaseIndexer } from "@/db-indexer";
import { ProxiedToken } from "@/proxied-token";
import { fetchArtist, fetchArtists } from "@apollo/cosmo/server/artists";
import { members } from "@apollo/database/indexer/schema";
import { memberSortOrder } from "@apollo/util";
import { sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import { randomUUID } from "node:crypto";
import type { ScheduledTask } from "../task";

/**
 * Sync the canonical member list (sort order, alias, units, colour) from the
 * COSMO API into the indexer `member` table, which backs member-sorted objekt
 * queries. Rosters change rarely, so this runs once a day.
 */
export const syncMembersTask = {
  name: "sync-members",
  cron: "0 4 * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseIndexer;
    const proxiedToken = yield* ProxiedToken;

    const { accessToken } = yield* proxiedToken.get;

    const artistList = yield* Effect.tryPromise({
      try: () => fetchArtists(accessToken),
      catch: (cause) => new FetchArtistsError({ cause }),
    });

    const artists = yield* Effect.all(
      artistList.map((artist) =>
        Effect.tryPromise({
          try: () => fetchArtist(accessToken, artist.name),
          catch: (cause) =>
            new FetchArtistError({ artist: artist.name, cause }),
        }),
      ),
      { concurrency: 5 },
    );

    const rows = artists.flatMap((artist, artistIndex) =>
      artist.artistMembers.map((member) => ({
        id: randomUUID(),
        name: member.name,
        cosmoId: member.id,
        artistId: artist.id,
        alias: member.alias,
        // COSMO returns units as a single comma-delimited string
        units: member.units
          .split(",")
          .map((unit) => unit.trim())
          .filter(Boolean),
        primaryColorHex: member.primaryColorHex,
        sortOrder: memberSortOrder(artistIndex, member.order),
      })),
    );

    if (rows.length === 0) {
      return yield* new NoMembersError();
    }

    yield* Effect.tryPromise({
      try: async () => {
        await db
          .insert(members)
          .values(rows)
          .onConflictDoUpdate({
            target: members.name,
            set: {
              cosmoId: sql`excluded.cosmo_id`,
              artistId: sql`excluded.artist_id`,
              alias: sql`excluded.alias`,
              units: sql`excluded.units`,
              primaryColorHex: sql`excluded.primary_color_hex`,
              sortOrder: sql`excluded.sort_order`,
            },
          });
      },
      catch: (cause) => new StoreMembersError({ cause }),
    });

    yield* Effect.logInfo(`Synced ${rows.length} members`);
  }),
} satisfies ScheduledTask;

/**
 * Failed to fetch the artists list from the COSMO API.
 */
export class FetchArtistsError extends Data.TaggedError("FetchArtistsError")<{
  readonly cause: unknown;
}> {}

/**
 * Failed to fetch a specific artist from the COSMO API.
 */
export class FetchArtistError extends Data.TaggedError("FetchArtistError")<{
  readonly artist: string;
  readonly cause: unknown;
}> {}

/**
 * Failed to upsert members into the indexer database.
 */
export class StoreMembersError extends Data.TaggedError("StoreMembersError")<{
  readonly cause: unknown;
}> {}

/**
 * The COSMO API returned no members to sync.
 */
export class NoMembersError extends Data.TaggedError("NoMembersError")<{}> {}
