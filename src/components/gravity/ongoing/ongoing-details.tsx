import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { CosmoOngoingGravity } from "@/lib/universal/cosmo/gravity";
import { getPollStatus } from "@/lib/utils";
import GravityHeader from "../gravity-header";
import Countdown from "./countdown";
import { ErrorBoundary } from "react-error-boundary";
import { Error } from "@/components/error-boundary";
import { Suspense } from "react";
import Skeleton from "@/components/skeleton/skeleton";
import GravityPoll from "./gravity-poll";

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
  const currentPoll = gravity.polls.find(
    (poll) => getPollStatus(poll) === "ongoing"
  );
  const currentIndex = gravity.polls.findIndex(
    (poll) => poll.id === currentPoll?.id
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <GravityHeader gravity={gravity} />

      <div className="flex flex-col gap-4 justify-center w-full">
        <Countdown
          className="rounded-lg"
          pollEndDate={currentPoll?.endDate}
          gravityEndDate={gravity.entireEndDate}
        />

        {authenticated === false ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <p className="text-sm font-semibold">
              Sign in to view polls and vote!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <ErrorBoundary
              fallback={<Error message="Something went wrong fetching polls" />}
            >
              <Suspense fallback={<Skeleton className="h-12 w-full" />}>
                {currentPoll && (
                  <GravityPoll
                    title="Current Poll"
                    artist={artist}
                    gravityId={gravity.id}
                    pollId={currentPoll.id}
                  />
                )}

                {gravity.polls.map((poll, i) =>
                  i !== currentIndex ? (
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
          </div>
        )}
      </div>
    </div>
  );
}
