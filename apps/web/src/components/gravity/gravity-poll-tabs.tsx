import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PollStatus } from "@/lib/client/gravity/util";
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

  const statuses = pollStatuses(props.gravity);

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
                  <StatusDot
                    status={hydrated ? statuses.get(poll.cosmoId) : undefined}
                  />
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

/** Phase colors, following the countdown badge; the live phases pulse. */
const STATUS_COLORS = {
  upcoming: "bg-gravity-starts",
  ongoing: "animate-pulse bg-red-500",
  counting: "animate-pulse bg-cosmo",
  finalized: "bg-green-500",
} as const satisfies Record<PollStatus, string>;

/** Undefined until hydration settles the status against the current time. */
function StatusDot({ status }: { status: PollStatus | undefined }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        status === undefined ? "bg-muted-foreground/40" : STATUS_COLORS[status],
      )}
    />
  );
}

/**
 * Each poll's phase right now, by COSMO poll id.
 */
function pollStatuses(gravity: CosmoOngoingGravity | CosmoPastGravity) {
  const polls: (CosmoPollUpcoming | CosmoPollFinalized)[] = gravity.polls;

  return new Map(polls.map((poll) => [poll.id, getPollStatus(poll)]));
}
