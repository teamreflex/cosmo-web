import { Metadata } from "next";
import { decodeUser } from "../data-fetching";
import UserDialog from "@/components/activity/user-dialog";
import { getSelectedArtist } from "@/lib/server/profiles";
import { Suspense } from "react";
import ArtistBlock from "@/components/activity/artist-block";
import {
  ArtistBlockSkeleton,
  BadgeBlockSkeleton,
  HistoryBlockSkeleton,
  ObjektBlockSkeleton,
} from "./loading";
import ObjektsBlock from "@/components/activity/objekts-block";
import { ErrorBoundary } from "react-error-boundary";
import { HeartCrack } from "lucide-react";
import HistoryBlock from "@/components/activity/history-block";
import BadgeBlock from "@/components/activity/badge-block";
import { redirect } from "next/navigation";
import RankingBlock from "@/components/activity/ranking/ranking-block";
import Skeleton from "@/components/skeleton/skeleton";
import AuthFallback from "@/components/navbar/auth-fallback";

export const metadata: Metadata = {
  title: "Activity",
};

export default async function ActivityPage() {
  const token = await decodeUser();
  if (!token) {
    redirect("/");
  }

  const artist = getSelectedArtist();

  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex items-center">
        <div className="w-full flex gap-2 items-center justify-between h-10">
          <h1 className="text-3xl font-cosmo uppercase">Activity</h1>

          <ErrorBoundary fallback={<AuthFallback />}>
            <Suspense
              fallback={<Skeleton className="h-10 w-10 rounded-full" />}
            >
              <UserDialog token={token} artist={artist} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* content */}
      <div className="w-full sm:w-2/3 md:w-1/2 flex flex-col gap-4 mx-auto">
        <ErrorBoundary fallback={<Error error="Could not load history" />}>
          <Suspense fallback={<HistoryBlockSkeleton />}>
            <HistoryBlock user={token} artist={artist} />
          </Suspense>
        </ErrorBoundary>

        <div className="grid grid-cols-2 gap-4">
          <ErrorBoundary
            fallback={<Error error="Could not load artist information" />}
          >
            <Suspense fallback={<ArtistBlockSkeleton />}>
              <ArtistBlock user={token} artist={artist} />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary
            fallback={<Error error="Could not load badge information" />}
          >
            <Suspense fallback={<BadgeBlockSkeleton />}>
              <BadgeBlock user={token} artist={artist} />
            </Suspense>
          </ErrorBoundary>
        </div>

        <RankingBlock artist={artist} />

        <ErrorBoundary fallback={<Error error="Could not load objekts" />}>
          <Suspense fallback={<ObjektBlockSkeleton />}>
            <ObjektsBlock user={token} artist={artist} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </main>
  );
}

function Error({ error }: { error: string }) {
  return (
    <div className="w-full flex flex-col items-center mx-auto">
      <HeartCrack className="w-12 h-12" />
      <span className="text-sm font-semibold">{error}</span>
    </div>
  );
}
