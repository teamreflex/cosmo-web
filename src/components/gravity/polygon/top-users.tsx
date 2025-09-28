import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";
import { useMemo } from "react";
import type { PollSelectedContentImage } from "@/lib/universal/cosmo/gravity";
import type {
  AggregatedVotes,
  RevealedVote,
} from "@/lib/client/gravity/polygon/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  votes: RevealedVote[];
  candidates: PollSelectedContentImage[];
};

export default function TopUsers(props: Props) {
  const users = useMemo(() => {
    if (props.votes.length === 0) {
      return [];
    }

    // 1. aggregate votes by user
    const voteMap = new Map<string, AggregatedVotes>();
    for (const vote of props.votes) {
      const address = vote.voter.toLowerCase();
      const candidate = props.candidates[vote.candidateId];
      if (!candidate) {
        continue;
      }

      const content = candidate.content;
      const nickname = vote.username ?? address.substring(0, 8);

      let aggregated = voteMap.get(address);
      if (!aggregated) {
        aggregated = {
          address,
          nickname,
          candidates: {},
          total: 0,
        };
        voteMap.set(address, aggregated);
      }

      if (!aggregated.candidates[vote.candidateId]) {
        aggregated.candidates[vote.candidateId] = {
          comoAmount: 0,
          id: vote.candidateId,
          title: content.title,
          imageUrl: content.imageUrl,
        };
      }

      aggregated.total += vote.comoAmount;
      aggregated.candidates[vote.candidateId]!.comoAmount += vote.comoAmount;
    }

    // 2. use a min-heap to find top 25 users efficiently
    const topUsersHeap: AggregatedVotes[] = [];
    const heapSize = 25;

    // maintain min-heap property (sort asc, simple for K=25)
    const maintainHeap = () => {
      topUsersHeap.sort((a, b) => a.total - b.total);
    };

    for (const user of voteMap.values()) {
      if (topUsersHeap.length < heapSize) {
        topUsersHeap.push(user);
        maintainHeap();
      } else if (
        topUsersHeap[0] !== undefined &&
        user.total > topUsersHeap[0].total
      ) {
        // compare with min element
        topUsersHeap[0] = user;
        maintainHeap();
      }
    }

    // 3. sort the final top 25 desc for display
    return topUsersHeap.sort((a, b) => b.total - a.total);
  }, [props.votes, props.candidates]);

  return (
    <div className="flex w-full flex-col gap-2">
      <AnimatePresence initial={false}>
        {users.map((user) => (
          <motion.div
            key={user.address}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 0.3,
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          >
            <Row user={user} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

type RowProps = {
  user: AggregatedVotes;
};

function Row({ user }: RowProps) {
  const nickname = user.nickname ?? user.address.substring(0, 8);
  const candidates = Object.values(user.candidates).sort(
    (a, b) => b.comoAmount - a.comoAmount,
  );

  return (
    <div className="flex h-12 w-full items-center rounded-lg bg-secondary/70 px-4 transition-all hover:bg-secondary">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{nickname}</span>
        <span className="text-xs">{user.total.toLocaleString()} COMO</span>
      </div>

      <span className="ml-auto flex items-center -space-x-3">
        {candidates.map((candidate) => (
          <TooltipProvider key={candidate.id}>
            <Tooltip>
              <TooltipTrigger>
                <Avatar
                  key={candidate.title}
                  className="size-8 rounded ring ring-secondary"
                >
                  <AvatarFallback>{candidate.title.at(0)}</AvatarFallback>
                  <AvatarImage src={candidate.imageUrl} />
                </Avatar>
              </TooltipTrigger>
              <TooltipContent className="flex flex-col">
                <span className="font-semibold">{candidate.title}</span>
                <span className="text-xs">
                  {candidate.comoAmount.toLocaleString()} COMO
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </span>
    </div>
  );
}
