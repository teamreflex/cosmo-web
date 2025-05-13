import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@/lib/universal/cosmo/gravity";
import CandidateBreakdown from "./candidate-breakdown";
import TimelineChart from "./timeline-chart";
import VoterBreakdown from "./voter-breakdown";
import { fetchPolygonGravity } from "@/lib/server/gravity";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
};

export default async function PolygonLiveChart({ artist, gravity }: Props) {
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

      <VoterBreakdown
        candidates={data.poll.pollViewMetadata.selectedContent}
        tokenId={artist.comoTokenId}
        pollId={data.poll.pollIdOnChain}
        revealedVotes={data.revealedVotes}
      />
    </div>
  );
}
