import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import GravityHeader from "../gravity-header";
import { CosmoPastGravity } from "@/lib/universal/cosmo/gravity";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Crown, Loader2 } from "lucide-react";
import Image from "next/image";
import GravityRanking from "./gravity-ranking";
import { cn } from "@/lib/utils";
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
              {/* total como used */}
              <div className="flex flex-col items-center justify-center bg-accent rounded-xl py-4 w-full sm:w-2/3">
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
          value="live"
          className="flex flex-col gap-4 w-full items-center"
        >
          <ErrorBoundary
            fallback={
              <div className="flex flex-col gap-2 justify-center items-center py-4">
                <AlertTriangle className="size-12" />
                <p className="text-sm font-semibold">
                  Failed to load live chart. Please try again later.
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
            <MyRecord gravity={gravity} />
          </Suspense>
        </TabsContent>
      </GravityQueryTabs>
    </div>
  );
}
