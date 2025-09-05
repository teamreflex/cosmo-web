import { cacheHeaders } from "@/app/api/common";
import { db } from "@/lib/server/db";
import { gravities, gravityPolls } from "@/lib/server/db/schema";
import { fetchAbstractVotes } from "@/lib/server/gravity";
import { isPast } from "date-fns";
import { eq } from "drizzle-orm";

type Props = {
  params: Promise<{
    pollId: string;
  }>;
};

/**
 * API route that fetches votes for a given poll.
 */
export async function GET(_: Request, props: Props) {
  const params = await props.params;

  // validate pollId
  const pollId = Number(params.pollId);
  if (isNaN(pollId)) {
    return Response.json({ error: "Invalid poll ID" }, { status: 422 });
  }

  // fetch gravity end date
  const [gravity] = await db
    .select({ endDate: gravities.endDate })
    .from(gravityPolls)
    .innerJoin(gravities, eq(gravityPolls.cosmoGravityId, gravities.cosmoId))
    .where(eq(gravityPolls.cosmoId, pollId))
    .limit(1);

  if (!gravity) {
    return Response.json({ error: "Poll not found" }, { status: 404 });
  }

  const votes = await fetchAbstractVotes(pollId);
  const cacheTime = isPast(gravity.endDate) ? 60 * 60 * 24 * 30 : 60 * 10; // 30 days if past, 10 minutes if not

  return Response.json(votes, {
    headers: cacheHeaders({ vercel: cacheTime }),
  });
}
