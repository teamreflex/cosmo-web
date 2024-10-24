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
import { Crown, Loader2 } from "lucide-react";
import Image from "next/image";
import GravityRankingCarousel from "./gravity-ranking-carousel";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import GravityMyRecord from "./gravity-my-record";
import GravityOngoingCountdown from "./gravity-ongoing-countdown";
import GravityVote from "./gravity-vote";
import AvailableComo from "./available-como";

type Props = {
  gravity: CosmoGravity;
  authenticated: boolean;
};

export default function GravityCoreDetails({ gravity, authenticated }: Props) {
  if (isPast(new Date(gravity.entireEndDate))) {
    return <PastDetails gravity={gravity as CosmoPastGravity} />;
  }

  if (isFuture(new Date(gravity.entireStartDate))) {
    return <UpcomingDetails gravity={gravity as CosmoUpcomingGravity} />;
  }

  return (
    <OngoingDetails
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

            <div className="rounded-xl relative aspect-square w-full bg-gradient-to-t from-black to-transparent overflow-clip">
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

          {/* ranking */}
          <div className="flex flex-col gap-2 items-center mx-auto bg-accent rounded-xl w-full sm:w-2/3">
            <div className="flex flex-col w-full divide-y-2 divide-white/80">
              {gravity.polls.map((poll) => (
                <div className="flex flex-col gap-2" key={poll.id}>
                  <GravityRankingCarousel poll={poll}>
                    {gravity.polls.length > 1 ? (
                      <p className="font-bold">Result of {poll.title}</p>
                    ) : (
                      <p className="font-bold">Ranking of this Gravity</p>
                    )}
                  </GravityRankingCarousel>
                </div>
              ))}
            </div>
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
  gravity: CosmoOngoingGravity;
  authenticated: boolean;
};

function OngoingDetails({ gravity, authenticated }: OngoingDetailsProps) {
  const currentPoll = gravity.polls.find((poll) => {
    return (
      new Date(poll.startDate) <= new Date() &&
      new Date(poll.endDate) >= new Date()
    );
  });

  return (
    <div className="flex flex-col gap-2 w-full">
      <Header gravity={gravity} />

      <div className="flex flex-col gap-4 justify-center w-full py-12">
        <GravityOngoingCountdown
          className="rounded-lg"
          pollEndDate={currentPoll?.endDate}
          gravityEndDate={gravity.entireEndDate}
        />

        {authenticated && currentPoll && (
          <GravityVote
            gravity={gravity}
            availableComo={
              <Suspense
                fallback={<Loader2 className="animate-spin h-12 w-12" />}
              >
                <AvailableComo artist={gravity.artist} />
              </Suspense>
            }
          />
        )}
      </div>
    </div>
  );
}

// common to all types
function Header({ gravity }: { gravity: CosmoGravity }) {
  return (
    <>
      <h2 className="text-xl font-bold">{gravity.title}</h2>
      <div className="flex gap-2 items-center">
        <GravityEventType type={gravity.type} />
        <span>·</span>
        <GravityTimestamp
          start={gravity.entireStartDate}
          end={gravity.entireEndDate}
        />
      </div>
    </>
  );
}
