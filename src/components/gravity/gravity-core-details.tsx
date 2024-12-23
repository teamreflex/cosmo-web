import {
  CosmoGravity,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoUpcomingGravity,
} from "@/lib/universal/cosmo/gravity";
import { isFuture, isPast } from "date-fns";
import GravityEventType from "./gravity-event-type";
import GravityTimestamp from "./gravity-timestamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown } from "lucide-react";
import Image from "next/image";
import { cn, getPollStatus } from "@/lib/utils";
import { Suspense } from "react";
import GravityMyRecord from "./gravity-my-record";
import GravityOngoingCountdown from "./gravity-ongoing-countdown";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { ErrorBoundary } from "react-error-boundary";
import { Error } from "../error-boundary";
import Skeleton from "../skeleton/skeleton";
import GravityPoll from "./gravity-poll";
import GravityRanking from "./gravity-ranking";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoGravity;
  authenticated: boolean;
};

export default function GravityCoreDetails({
  artist,
  gravity,
  authenticated,
}: Props) {
  if (isPast(new Date(gravity.entireEndDate))) {
    return <PastDetails gravity={gravity as CosmoPastGravity} />;
  }

  if (isFuture(new Date(gravity.entireStartDate))) {
    return <UpcomingDetails gravity={gravity as CosmoUpcomingGravity} />;
  }

  return (
    <OngoingDetails
      artist={artist}
      gravity={gravity as CosmoOngoingGravity}
      authenticated={authenticated}
    />
  );
}

function PastDetails({ gravity }: { gravity: CosmoPastGravity }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <Header gravity={gravity} />

      <Tabs defaultValue="result" className="flex flex-col items-center">
        <TabsList className="grid grid-cols-2 w-full sm:w-1/2">
          <TabsTrigger value="result">Gravity Result</TabsTrigger>
          <TabsTrigger value="record">My Record</TabsTrigger>
        </TabsList>
        <TabsContent
          value="result"
          className="flex flex-col gap-2 w-full items-center"
        >
          {gravity.result !== undefined && (
            <div className="contents">
              {/* total como used */}
              <div className="flex flex-col items-center justify-center bg-accent rounded-xl py-4 w-full sm:w-1/2">
                <p className="font-bold text-sm">Total COMO collected</p>
                <p className="text-2xl font-bold text-cosmo-text">
                  {gravity.result.totalComoUsed.toLocaleString()}
                </p>
              </div>

              {/* final choice */}
              <div className="flex flex-col mx-auto bg-accent rounded-xl w-full sm:w-2/3">
                <div className="flex gap-2 font-bold p-3">
                  <p>Our Final Choice</p>
                  <Crown />
                </div>

                <div className="rounded-xl relative aspect-square w-full bg-linear-to-t from-black to-transparent text-clip">
                  <Image
                    className="absolute"
                    src={gravity.result.resultImageUrl}
                    fill={true}
                    alt={gravity.result.resultTitle}
                  />

                  <p className="absolute bottom-4 left-4 font-bold text-xl">
                    {gravity.result.resultTitle}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ranking */}
          <div className="flex mx-auto w-full sm:w-2/3">
            <GravityRanking gravity={gravity} />
          </div>

          {/* leaderboard */}
          <div className="flex flex-col mx-auto bg-accent rounded-xl w-full sm:w-2/3">
            <p className="p-3 font-bold">Total Contribution Leaderboard</p>

            <table>
              <tbody>
                {gravity.leaderboard.userRanking.map((user) => (
                  <tr
                    key={user.rank}
                    className={cn(
                      "flex w-full h-10 items-center px-3 hover:bg-black/70 transition-colors font-semibold",
                      user.rank === 1 && "text-cosmo-text"
                    )}
                  >
                    <td className="w-10">{user.rank}</td>
                    <td className="flex grow">{user.user.nickname}</td>
                    <td className="flex justify-end">
                      {user.totalComoUsed.toLocaleString()} COMO
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent
          value="record"
          className="flex flex-col gap-4 w-full items-center"
        >
          <Suspense
            fallback={
              <div className="flex flex-col gap-2 w-full sm:w-1/2 mx-auto animate-pulse h-24" />
            }
          >
            <GravityMyRecord gravity={gravity} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UpcomingDetails({ gravity }: { gravity: CosmoUpcomingGravity }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <Header gravity={gravity} />

      <div className="flex justify-center w-full py-12">
        <h2 className="text-2xl font-bold">Gravity is about to start</h2>
      </div>
    </div>
  );
}

type OngoingDetailsProps = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity;
  authenticated: boolean;
};

function OngoingDetails({
  artist,
  gravity,
  authenticated,
}: OngoingDetailsProps) {
  const currentPoll = gravity.polls.find(
    (poll) => getPollStatus(poll) === "ongoing"
  );
  const currentIndex = gravity.polls.findIndex(
    (poll) => poll.id === currentPoll?.id
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <Header gravity={gravity} />

      <div className="flex flex-col gap-4 justify-center w-full">
        <GravityOngoingCountdown
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

// common to all types
function Header({ gravity }: { gravity: CosmoGravity }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">{gravity.title}</h2>
      <div className="flex gap-2 items-center">
        <GravityEventType type={gravity.type} />
        <span>·</span>
        <GravityTimestamp
          start={gravity.entireStartDate}
          end={gravity.entireEndDate}
        />
      </div>
    </div>
  );
}
