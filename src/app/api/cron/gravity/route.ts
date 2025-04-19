import { getArtistsWithMembers } from "@/app/data-fetching";
import { env } from "@/env";
import { fetchGravities, fetchPoll } from "@/lib/server/cosmo/gravity";
import { db } from "@/lib/server/db";
import { dbi } from "@/lib/server/db/interactive";
import {
  gravities,
  gravityPollCandidates,
  gravityPolls,
} from "@/lib/server/db/schema";
import { withProxiedToken } from "@/lib/server/handlers/withProxiedToken";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { chunk } from "@/lib/utils";
import { eq } from "drizzle-orm";

// TODO: undo when migrated
export const GET = () => {
  return new Response("ok");
};

/**
 * Fetch and load gravity data into the database.
 */
const _GET = withProxiedToken(async ({ req, token }) => {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("unauthorized", {
      status: 401,
    });
  }

  // fetch all artists
  const artists = await getArtistsWithMembers();

  // process gravities for each artist in parallel
  await Promise.all(
    artists.map((artist) => processGravities(token.accessToken, artist))
  );

  return new Response("ok");
});

/**
 * Process the gravities for a given artist.
 */
async function processGravities(
  token: string,
  artist: CosmoArtistWithMembersBFF
) {
  console.log(`loading gravities for ${artist.title}`);

  const list = await fetchGravities(artist.id);
  const remoteGravities = [
    ...list.ongoing,
    ...list.upcoming,
    ...list.past,
  ].sort(
    (a, b) =>
      new Date(a.entireStartDate).getTime() -
      new Date(b.entireStartDate).getTime()
  );

  // get the currently stored gravities
  const storedGravities = await db
    .select({
      cosmoId: gravities.cosmoId,
    })
    .from(gravities)
    .where(eq(gravities.artist, artist.id));

  // find the ones that aren't stored
  const notStoredGravities = remoteGravities.filter(
    (gravity) => !storedGravities.some((g) => g.cosmoId === gravity.id)
  );

  // operate on chunks of 5 gravities at a time
  await chunk(notStoredGravities, 5, async (chunked) => {
    for (const gravity of chunked) {
      const polls = await Promise.all(
        gravity.polls.map(async (poll) =>
          fetchPoll(token, artist.id, gravity.id, poll.id)
        )
      );

      // store data in a transaction
      await dbi
        .transaction(async (tx) => {
          // store gravity
          await tx
            .insert(gravities)
            .values({
              artist: artist.id,
              cosmoId: gravity.id,
              title: cleanString(gravity.title),
              description: cleanString(gravity.description),
              image: gravity.bannerImageUrl,
              gravityType: gravity.type,
              pollType: gravity.pollType,
              startDate: new Date(gravity.entireStartDate),
              endDate: new Date(gravity.entireEndDate),
            })
            .returning();

          // store polls
          await tx.insert(gravityPolls).values(
            polls.map((poll) => ({
              cosmoGravityId: gravity.id,
              cosmoId: poll.id,
              pollIdOnChain: poll.pollIdOnChain,
              title: cleanString(poll.title),
            }))
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
            }))
          );
          await tx.insert(gravityPollCandidates).values(candidates);
        })
        .catch((err) => {
          console.error(`error storing gravity ${gravity.id}`, err);
        });

      console.log(`stored ${cleanString(gravity.title)}`);
    }
  });

  console.log(
    `processed ${notStoredGravities.length} gravities for ${artist.title}`
  );
}

/**
 * Clean up any inconsistent newline usage in titles/descriptions.
 */
function cleanString(str: string) {
  return str.replaceAll("\n", " ").replaceAll("  ", " ");
}
