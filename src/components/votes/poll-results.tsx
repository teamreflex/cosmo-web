import { CosmoPollType } from "@/lib/universal/cosmo/gravity";
import { PollResult, VoteResult } from "@/lib/universal/votes";
import ArtistIcon from "../artist-icon";
import VoteTimestamp from "./vote-timestamp";

type Props = {
  artist: string;
  pollType: CosmoPollType;
  polls: PollResult[];
};

export default function PollResults({ artist, pollType, polls }: Props) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {polls.map((poll) => (
        <div key={poll.id} className="flex flex-col">
          {/* show poll title when there's multiple polls */}
          {pollType === "combination-poll" && (
            <h3 className="text-lg font-medium text-center underline underline-offset-2 decoration-cosmo-text">
              {poll.title}
            </h3>
          )}

          {/* votes */}
          <div className="flex flex-col gap-1">
            {poll.votes.map((vote) => (
              <VoteRow key={vote.id} artist={artist} vote={vote} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type VoteRowProps = {
  artist: string;
  vote: VoteResult;
};

function VoteRow({ artist, vote }: VoteRowProps) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 gap-4 items-center">
        <p className="font-medium place-self-end">
          {vote.candidate ?? "Unknown"}
        </p>

        <div className="flex gap-2 items-center place-self-start">
          <ArtistIcon artist={artist} />
          <p className="font-medium">{vote.amount}</p>
        </div>
      </div>

      <div className="flex col-span-2 justify-center" suppressHydrationWarning>
        <VoteTimestamp timestamp={vote.createdAt} />
      </div>
    </div>
  );
}
