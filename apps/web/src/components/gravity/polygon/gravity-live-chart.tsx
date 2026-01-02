import { polygonGravityQuery } from "@/lib/queries/gravity";
import type { CosmoArtistBFF } from "@apollo/cosmo/types/artists";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@apollo/cosmo/types/gravity";
import { useSuspenseQuery } from "@tanstack/react-query";
import CandidateBreakdown from "../candidate-breakdown";
import VoterBreakdown from "../voter-breakdown";
import TimelineChart from "./timeline-chart";

export type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
};

export default function PolygonLiveChart({ artist, gravity }: Props) {
  const { data } = useSuspenseQuery(polygonGravityQuery(artist.id, gravity.id));

  return (
    <div className="flex w-full flex-col gap-2">
      <TimelineChart
        start={data.poll.startDate}
        end={data.poll.endDate}
        revealedVotes={data.revealedVotes}
        totalComoUsed={data.totalComoUsed}
      />

      <CandidateBreakdown
        content={data.poll.pollViewMetadata.selectedContent}
        comoByCandidate={data.comoByCandidate}
        liveStatus="finalized"
        isRefreshing={false}
      />

      <VoterBreakdown
        candidates={data.poll.pollViewMetadata.selectedContent}
        tokenId={artist.comoTokenId}
        pollId={data.poll.pollIdOnChain}
        revealedVotes={data.revealedVotes}
      />
    </div>
  );
}
