import { cacheHeaders } from "@/app/api/common";
import { fetchAbstractVotes } from "@/lib/server/gravity";

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

  const votes = await fetchAbstractVotes(pollId);
  return Response.json(votes, {
    headers: cacheHeaders({ vercel: 60 * 5 }), // 5 minutes
  });
}
