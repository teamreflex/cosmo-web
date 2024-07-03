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

export const metadata: Metadata = {
  title: "Activity",
};

export default async function ActivityPage() {
  const user = await decodeUser();
  const artist = getSelectedArtist();

  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex items-center">
        <div className="w-full flex gap-2 items-center justify-between">
          <h1 className="text-3xl font-cosmo uppercase">Activity</h1>

          <UserDialog user={user!} />
        </div>
      </div>

      {/* content */}
      <div className="w-full sm:w-2/3 md:w-1/2 flex flex-col gap-4 mx-auto">
        <ErrorBoundary fallback={<Error error="Could not load history" />}>
          <Suspense fallback={<HistoryBlockSkeleton />}>
            <HistoryBlock user={user!} artist={artist} />
          </Suspense>
        </ErrorBoundary>

        <div className="grid grid-cols-2 gap-4">
          <ErrorBoundary
            fallback={<Error error="Could not load artist information" />}
          >
            <Suspense fallback={<ArtistBlockSkeleton />}>
              <ArtistBlock user={user!} artist={artist} />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary
            fallback={<Error error="Could not load badge information" />}
          >
            <Suspense fallback={<BadgeBlockSkeleton />}>
              <BadgeBlock user={user!} artist={artist} />
            </Suspense>
          </ErrorBoundary>
        </div>

        <ErrorBoundary fallback={<Error error="Could not load objekts" />}>
          <Suspense fallback={<ObjektBlockSkeleton />}>
            <ObjektsBlock user={user!} artist={artist} />
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
