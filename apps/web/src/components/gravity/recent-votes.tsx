import { m } from "@/i18n/messages";
import { recentVotesQuery } from "@/lib/queries/gravity";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

type Props = {
  pollId: number;
  /** Votes are only worth polling for while the poll is taking them. */
  enabled: boolean;
};

/**
 * The rail while voting: the latest votes cast, without their picks — COSMO
 * keeps those sealed until counting begins.
 */
export default function RecentVotes(props: Props) {
  const { data } = useQuery(
    recentVotesQuery({ pollId: props.pollId, enabled: props.enabled }),
  );
  const votes = data ?? [];

  return (
    // the sealed panel sits alongside this card, and the two share a height
    <div className="flex min-h-36 flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-cosmo" />
          {m.gravity_recent_votes()}
        </h2>
        <p className="text-xs text-muted-foreground">
          {m.gravity_picks_hidden()}
        </p>
      </div>

      {votes.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          {m.gravity_no_votes_yet()}
        </p>
      ) : (
        <div className="flex max-h-120 flex-col overflow-y-auto">
          {votes.map((vote) => (
            <div key={vote.id} className="flex h-8 items-center gap-2">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {format(new Date(vote.createdAt), "HH:mm:ss")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {vote.username ?? vote.address.substring(0, 8)}
              </span>
              <span className="shrink-0 font-mono text-xs">
                {vote.amount.toLocaleString()} {m.common_como()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
