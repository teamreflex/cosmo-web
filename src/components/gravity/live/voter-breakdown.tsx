import { useSuspenseVoterNames } from "@/lib/client/gravity/hooks";
import { RevealedVote } from "@/lib/client/gravity/types";
import { PollSelectedContentImage } from "@/lib/universal/cosmo/gravity";
import TopVotes from "./top-votes";
import TopUsers from "./top-users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  contract: string;
  pollId: number;
  revealedVotes: RevealedVote[];
  candidates: PollSelectedContentImage[];
};

export default function VoterBreakdown(props: Props) {
  const { data } = useSuspenseVoterNames({
    contract: props.contract,
    pollId: BigInt(props.pollId),
  });

  const topVotes = props.revealedVotes.slice(0, 25);

  return (
    <Tabs defaultValue="top-votes">
      <TabsList>
        <TabsTrigger value="top-votes">Top Votes</TabsTrigger>
        <TabsTrigger value="top-users">Top Users</TabsTrigger>
      </TabsList>

      <TabsContent value="top-votes">
        <TopVotes
          votes={topVotes}
          nicknames={data}
          candidates={props.candidates}
        />
      </TabsContent>
      <TabsContent value="top-users">
        <TopUsers
          votes={props.revealedVotes}
          nicknames={data}
          candidates={props.candidates}
        />
      </TabsContent>
    </Tabs>
  );
}
