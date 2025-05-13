"use client";

import { RevealedVote } from "@/lib/client/gravity/polygon/types";
import { PollSelectedContentImage } from "@/lib/universal/cosmo/gravity";
import TopVotes from "./top-votes";
import TopUsers from "./top-users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { use } from "react";

type Props = {
  tokenId: number;
  pollId: number;
  revealedVotes: RevealedVote[];
  candidates: PollSelectedContentImage[];
  voters: Promise<Record<string, string | undefined>>;
};

export default function VoterBreakdown(props: Props) {
  const data = use(props.voters);
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
