import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import GravityHeader from "../gravity-header";
import { CosmoPastGravity } from "@/lib/universal/cosmo/gravity";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, AlertTriangle, Crown, Loader2 } from "lucide-react";
import Image from "next/image";
import GravityRanking from "./gravity-ranking";
import { ordinal } from "@/lib/utils";
import { Suspense } from "react";
import MyRecord from "./my-record";
import GravityQueryTabs from "../gravity-query-tabs";
import GravityLiveChart from "../live/gravity-live-chart";
import { ErrorBoundary } from "react-error-boundary";

type PastDetailsProps = {
  artist: CosmoArtistBFF;
  gravity: CosmoPastGravity;
};

export default function PastDetails({ artist, gravity }: PastDetailsProps) {
  const isLiveSupported = gravity.pollType === "single-poll";

  return (
    <div className="flex flex-col gap-2 w-full">
      <GravityHeader gravity={gravity} />

      <GravityQueryTabs
        defaultValue="result"
        className="flex flex-col items-center"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="result">Final Result</TabsTrigger>
          <TabsTrigger value="live">Chart</TabsTrigger>
          <TabsTrigger value="record">My Record</TabsTrigger>
        </TabsList>

        <TabsContent
          value="result"
          className="flex flex-col gap-2 w-full items-center"
        >
          {gravity.result !== undefined && (
            <div className="contents">
              <div className="xl:h-full w-full gap-2 flex flex-col-reverse xl:flex-row">
                {/* TODO: figure out how to make this properly fit */}
                {/* final choice */}
                <div className="flex shrink-0 h-fit flex-col bg-accent rounded-xl overflow-hidden">
                  <div className="flex gap-2 font-bold p-3">
                    <Crown />
                    <p>Final Choice</p>
                  </div>

                  <div className="relative shrink-0 aspect-square w-full xl:w-52 bg-linear-to-t from-black to-transparent">
                    <Image
                      src={gravity.result.resultImageUrl}
                      fill={true}
                      alt={gravity.result.resultTitle}
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* ranking */}
                <div className="flex-grow">
                  <GravityRanking
                    gravity={gravity}
                    totalComoUsed={gravity.result.totalComoUsed}
                  />
                </div>
              </div>
            </div>
          )}

          {/* leaderboard */}
          <div className="flex flex-col gap-2 w-full">
            {gravity.leaderboard.userRanking.map((user) => (
              <div
                key={user.rank}
                data-rank={user.rank}
                className="w-full h-12 rounded-lg px-4 flex items-center transition-all bg-accent/70 hover:bg-accent data-[rank=1]:text-cosmo-text"
              >
                <span className="text-xs w-8">{ordinal(user.rank)}</span>
                <span className="text-sm font-semibold">
                  {user.user.nickname}
                </span>

                <span className="text-sm ml-auto">
                  {user.totalComoUsed.toLocaleString()} COMO
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent
          value="live"
          className="flex flex-col gap-4 w-full items-center"
        >
          {isLiveSupported ? (
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
                <GravityLiveChart artist={artist} gravity={gravity} />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <div className="flex flex-col gap-2 justify-center items-center py-4">
              <AlertCircle className="size-12" />
              <p className="text-sm font-semibold">
                Live tracking is not supported for combination polls.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="record" className="flex w-full">
          <Suspense
            fallback={
              <div className="flex flex-col gap-2 w-full animate-pulse h-24" />
            }
          >
            <MyRecord gravity={gravity} />
          </Suspense>
        </TabsContent>
      </GravityQueryTabs>
    </div>
  );
}
