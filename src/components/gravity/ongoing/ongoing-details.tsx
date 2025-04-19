import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import {
  CosmoOngoingGravity,
  CosmoPollFinalized,
  CosmoPollUpcoming,
} from "@/lib/universal/cosmo/gravity";
import GravityHeader from "../gravity-header";
import Countdown from "./countdown";
import { ErrorBoundary } from "react-error-boundary";
import { Error } from "@/components/error-boundary";
import { Suspense } from "react";
import Skeleton from "@/components/skeleton/skeleton";
import GravityPoll from "./gravity-poll";
import { findPoll, getPollStatus } from "@/lib/client/gravity/util";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import GravityLiveChart from "../live/gravity-live-chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AnyPoll = CosmoPollUpcoming | CosmoPollFinalized;

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity;
  authenticated: boolean;
};

export default function OngoingDetails({
  artist,
  gravity,
  authenticated,
}: Props) {
  const isLiveSupported = gravity.pollType === "single-poll";
  const isCounting = findPoll(gravity).status === "counting";

  const ongoingPoll =
    gravity.polls.find((poll) => getPollStatus(poll) === "ongoing") ??
    gravity.polls[0];
  const index = gravity.polls.findIndex((poll) => poll.id === ongoingPoll.id);

  return (
    <div className="flex flex-col gap-2 w-full">
      <GravityHeader gravity={gravity} />

      <div className="flex flex-col gap-2 justify-center w-full">
        {isCounting ? (
          isLiveSupported ? (
            <OngoingCounting artist={artist} gravity={gravity} />
          ) : (
            <div className="flex flex-col gap-2 justify-center items-center py-4">
              <AlertCircle className="size-12" />
              <p className="text-sm font-semibold">
                Live tracking is not supported for combination polls.
              </p>
            </div>
          )
        ) : (
          <div className="contents">
            <Countdown
              className="rounded-lg"
              pollEndDate={ongoingPoll?.endDate}
              gravityEndDate={gravity.entireEndDate}
            />

            {authenticated === true && (
              <OngoingVote
                poll={ongoingPoll}
                index={index}
                artist={artist}
                gravity={gravity}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type OngoingVoteProps = {
  poll: AnyPoll;
  index: number;
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity;
};

function OngoingVote({ poll, index, artist, gravity }: OngoingVoteProps) {
  return (
    <ErrorBoundary
      fallback={<Error message="Something went wrong fetching polls" />}
    >
      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        {poll && (
          <GravityPoll
            title="Current Poll"
            artist={artist}
            gravityId={gravity.id}
            pollId={poll.id}
          />
        )}

        {gravity.polls.map((poll, i) =>
          i !== index ? (
            <GravityPoll
              key={poll.id}
              title={`Poll #${i + 1}`}
              artist={artist}
              gravityId={gravity.id}
              pollId={poll.id}
            />
          ) : null
        )}
      </Suspense>
    </ErrorBoundary>
  );
}

type OngoingCountingProps = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity;
};

function OngoingCounting({ artist, gravity }: OngoingCountingProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col gap-2 justify-center items-center py-4">
          <AlertTriangle className="size-12" />
          <p className="text-sm font-semibold">
            Failed to load live data. Please try again later.
          </p>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-4">
            <Loader2 className="size-12 animate-spin" />
          </div>
        }
      >
        <div className="contents">
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              Live gravity tracking is a work in progress and may not work
              properly.
            </AlertDescription>
          </Alert>
          <GravityLiveChart artist={artist} gravity={gravity} />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
