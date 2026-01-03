import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/i18n/messages";
import type {
  AggregatedTopUser,
  AggregatedTopVote,
} from "@/lib/client/gravity/abstract/types";
import type { PollSelectedContentImage } from "@apollo/cosmo/types/gravity";
import TopUsers from "./top-users";
import TopVotes from "./top-votes";

type Props = {
  topVotes: AggregatedTopVote[];
  topUsers: AggregatedTopUser[];
  candidates: PollSelectedContentImage[];
};

export default function VoterBreakdown(props: Props) {
  return (
    <Tabs defaultValue="top-votes">
      <TabsList>
        <TabsTrigger value="top-votes">{m.gravity_top_votes()}</TabsTrigger>
        <TabsTrigger value="top-users">{m.gravity_top_users()}</TabsTrigger>
      </TabsList>

      <TabsContent value="top-votes">
        <TopVotes votes={props.topVotes} candidates={props.candidates} />
      </TabsContent>
      <TabsContent value="top-users">
        <TopUsers users={props.topUsers} candidates={props.candidates} />
      </TabsContent>
    </Tabs>
  );
}
