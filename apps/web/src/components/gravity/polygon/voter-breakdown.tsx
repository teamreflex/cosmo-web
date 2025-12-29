import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/i18n/messages";
import type { RevealedVote } from "@/lib/client/gravity/polygon/types";
import type { PollSelectedContentImage } from "@apollo/cosmo/types/gravity";
import TopUsers from "./top-users";
import TopVotes from "./top-votes";

type Props = {
  tokenId: number;
  pollId: number;
  revealedVotes: RevealedVote[];
  candidates: PollSelectedContentImage[];
};

export default function VoterBreakdown(props: Props) {
  const topVotes = props.revealedVotes.slice(0, 25);

  return (
    <Tabs defaultValue="top-votes">
      <TabsList>
        <TabsTrigger value="top-votes">{m.gravity_top_votes()}</TabsTrigger>
        <TabsTrigger value="top-users">{m.gravity_top_users()}</TabsTrigger>
      </TabsList>

      <TabsContent value="top-votes">
        <TopVotes votes={topVotes} candidates={props.candidates} />
      </TabsContent>
      <TabsContent value="top-users">
        <TopUsers votes={props.revealedVotes} candidates={props.candidates} />
      </TabsContent>
    </Tabs>
  );
}
