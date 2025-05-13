import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@/lib/universal/cosmo/gravity";
import CandidateBreakdown from "./candidate-breakdown";
import TimelineChart from "./timeline-chart";
import VoterBreakdown from "./voter-breakdown";
import { fetchPolygonGravity } from "@/lib/server/gravity";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import Skeleton from "@/components/skeleton/skeleton";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
  voters: Promise<Record<string, string | undefined>>;
};

export default async function PolygonLiveChart({
  artist,
  gravity,
  voters,
}: Props) {
  const data = await fetchPolygonGravity(artist.id, gravity.id);

  return (
    <div className="flex flex-col w-full gap-2">
      <TimelineChart
        start={data.poll.startDate}
        end={data.poll.endDate}
        revealedVotes={data.revealedVotes}
        totalComoUsed={data.totalComoUsed}
      />

      <CandidateBreakdown
        content={data.poll.pollViewMetadata.selectedContent}
        comoByCandidate={data.comoByCandidate}
      />

      <ErrorBoundary
        fallback={
          <div className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Error loading voter data
            </p>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-48 rounded-md" />
              <div className="relative w-full flex flex-col gap-2">
                <SkeletonGradient />
                {Array.from({ length: 12 }).map((_, index) => (
                  <Skeleton key={index} className="w-full h-12 rounded-lg" />
                ))}
              </div>
            </div>
          }
        >
          <VoterBreakdown
            candidates={data.poll.pollViewMetadata.selectedContent}
            tokenId={artist.comoTokenId}
            pollId={data.poll.pollIdOnChain}
            revealedVotes={data.revealedVotes}
            voters={voters}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
