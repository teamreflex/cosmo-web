import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/hooks/use-hydrated";
import { getPollStatus } from "@/lib/client/gravity/util";
import { cn } from "@/lib/utils";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollFinalized,
  CosmoPollUpcoming,
} from "@apollo/cosmo/types/gravity";
import { getRouteApi } from "@tanstack/react-router";
import { format } from "date-fns";

const route = getRouteApi("/gravity/$artist/$id");

/** A gravity's poll as stored in the database; dates predate the column. */
type PollTab = {
  cosmoId: number;
  title: string;
  startDate: Date | null;
};

type Props = {
  polls: PollTab[];
  gravity: CosmoOngoingGravity | CosmoPastGravity;
  pollId: number;
};

export default function GravityPollTabs(props: Props) {
  const navigate = route.useNavigate();
  // poll status is relative to the current time, so it settles after hydration
  const hydrated = useHydrated();

  // a single-poll gravity is just the page itself
  if (props.polls.length < 2) {
    return null;
  }

  const live = livePollIds(props.gravity);

  return (
    <div className="sticky top-14 z-20 h-12 border-b border-border bg-background/90 backdrop-blur-lg">
      <div className="container no-scrollbar h-full overflow-x-auto">
        <Tabs
          variant="navbar"
          className="h-full"
          value={String(props.pollId)}
          onValueChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, poll: Number(value) }),
              replace: true,
            })
          }
        >
          <TabsList className="h-full w-max min-w-full border-none">
            {props.polls.map((poll) => (
              <TabsTrigger
                key={poll.cosmoId}
                value={String(poll.cosmoId)}
                className="min-w-24 flex-col gap-0 px-3"
              >
                <span className="flex items-center gap-1.5">
                  <StatusDot live={hydrated && live.has(poll.cosmoId)} />
                  {poll.title}
                </span>
                {/* a non-breaking space holds the line so titles never shift */}
                <span className="font-mono text-xxs leading-4 text-muted-foreground">
                  {hydrated && poll.startDate !== null
                    ? format(poll.startDate, "MMM d")
                    : " "}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

function StatusDot({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        live ? "animate-pulse bg-red-500" : "bg-muted-foreground/40",
      )}
    />
  );
}

/**
 * Polls taking votes or being counted right now, by COSMO poll id.
 */
function livePollIds(gravity: CosmoOngoingGravity | CosmoPastGravity) {
  const polls: (CosmoPollUpcoming | CosmoPollFinalized)[] = gravity.polls;

  return new Set(
    polls
      .filter((poll) => {
        const status = getPollStatus(poll);
        return status === "ongoing" || status === "counting";
      })
      .map((poll) => poll.id),
  );
}
