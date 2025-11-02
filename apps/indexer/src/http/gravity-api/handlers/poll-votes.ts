import { Client } from "pg";
import { Context } from "hono";
import { env } from "../env";

const client = new Client({
  host: env.DB_HOST,
  user: env.DB_READ_USER,
  database: env.DB_NAME,
  password: env.DB_READ_PASS,
  port: Number(env.DB_PORT),
});

// @ts-ignore - using bun
await client.connect();

/**
 * Fetch votes for a given poll and aggregate per candidate.
 */
export async function pollVotes(c: Context) {
  const pollId = parseInt(c.req.param("pollId"));

  if (isNaN(pollId)) {
    return c.json({ results: [] });
  }

  const result = await client.query<Vote>({
    text: `SELECT * FROM vote WHERE candidate_id IS NOT NULL AND poll_id = $1 ORDER BY created_at ASC`,
    values: [pollId],
  });

  const mapped = result.rows.reduce((acc, v: Vote) => {
    if (!acc[v.candidate_id]) {
      acc[v.candidate_id] = { comoAmount: 0, voteAmount: 0 };
    }
    acc[v.candidate_id].comoAmount += Number(v.amount) / 10 ** 18;
    acc[v.candidate_id].voteAmount += 1;
    return acc;
  }, {} as Record<number, VoteRecord>);

  return c.json({ results: mapped });
}

type Vote = {
  candidate_id: number;
  amount: string;
};

type VoteRecord = {
  comoAmount: number;
  voteAmount: number;
};
