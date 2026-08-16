import { fetchAllArtists } from "@apollo/cosmo/server/artists";
import { DatabaseIndexer } from "@/db-indexer";
import { ProxiedToken } from "@/proxied-token";
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

    const artists = yield* fetchAllArtists(accessToken);

    // order artists by comoTokenId so the per-artist grouping in sortOrder is deterministic
    const sortedArtists = [...artists].sort(
      (a, b) => a.comoTokenId - b.comoTokenId,
    );

    const rows = sortedArtists.flatMap((artist, artistIndex) =>
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

    yield* db
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

    yield* Effect.logInfo(`Synced ${rows.length} members`);
  }),
} satisfies ScheduledTask;

/**
 * The COSMO API returned no members to sync.
 */
export class NoMembersError extends Data.TaggedError("NoMembersError")<{}> {}
