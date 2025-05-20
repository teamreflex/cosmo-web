"use client";

import type { RevealedVote } from "@/lib/client/gravity/polygon/types";
import type { PollSelectedContentImage } from "@/lib/universal/cosmo/gravity";
import TopVotes from "./top-votes";
import TopUsers from "./top-users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <TabsTrigger value="top-votes">Top Votes</TabsTrigger>
        <TabsTrigger value="top-users">Top Users</TabsTrigger>
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
