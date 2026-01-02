import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AggregatedTopUser } from "@/lib/client/gravity/abstract/types";
import type { PollSelectedContentImage } from "@apollo/cosmo/types/gravity";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { useMemo } from "react";

type Props = {
  users: AggregatedTopUser[];
  candidates: PollSelectedContentImage[];
};

type CandidateBreakdown = {
  id: number;
  comoAmount: number;
  title: string;
  imageUrl: string;
};

export default function TopUsers(props: Props) {
  return (
    <div className="flex w-full flex-col gap-2">
      <AnimatePresence initial={false}>
        {props.users.map((user) => (
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
            <Row user={user} candidates={props.candidates} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

type RowProps = {
  user: AggregatedTopUser;
  candidates: PollSelectedContentImage[];
};

function Row({ user, candidates }: RowProps) {
  const nickname = user.nickname ?? user.address.substring(0, 8);

  // compute candidate breakdown from revealed votes only
  const candidateBreakdown = useMemo((): CandidateBreakdown[] => {
    const breakdown = new Map<number, CandidateBreakdown>();

    for (const vote of user.votes) {
      if (vote.candidateId === null) continue;

      const candidate = candidates[vote.candidateId];
      if (!candidate) continue;

      let entry = breakdown.get(vote.candidateId);
      if (!entry) {
        entry = {
          id: vote.candidateId,
          comoAmount: 0,
          title: candidate.content.title,
          imageUrl: candidate.content.imageUrl,
        };
        breakdown.set(vote.candidateId, entry);
      }
      entry.comoAmount += vote.amount;
    }

    return Array.from(breakdown.values()).sort(
      (a, b) => b.comoAmount - a.comoAmount,
    );
  }, [user.votes, candidates]);

  // compute revealed total
  const revealedTotal = useMemo(() => {
    return user.votes
      .filter((v) => v.candidateId !== null)
      .reduce((sum, v) => sum + v.amount, 0);
  }, [user.votes]);

  return (
    <div className="flex h-12 w-full items-center rounded-lg bg-secondary/70 px-4 transition-all hover:bg-secondary">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{nickname}</span>
        <span className="text-xs">{revealedTotal.toLocaleString()} COMO</span>
      </div>

      <span className="ml-auto flex items-center -space-x-3">
        {candidateBreakdown.map((candidate) => (
          <TooltipProvider key={candidate.id}>
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="size-8 rounded ring ring-secondary">
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
