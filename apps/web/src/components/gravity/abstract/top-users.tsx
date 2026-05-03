import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { m } from "@/i18n/messages";
import type { AggregatedTopUser } from "@/lib/client/gravity/abstract/types";
import type { PollSelectedContentImage } from "@apollo/cosmo/types/gravity";
import { IconQuestionMark } from "@tabler/icons-react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { useMemo } from "react";

type Props = {
  users: AggregatedTopUser[];
  candidates: PollSelectedContentImage[];
};

type UnrevealedVote = {
  id: string;
  comoAmount: number;
  candidate: null;
};

type RevealedVote = {
  id: string;
  comoAmount: number;
  candidate: {
    title: string;
    imageUrl: string;
  };
};

type CandidateBreakdown = UnrevealedVote | RevealedVote;

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
  const totalComo = user.votes.reduce((sum, v) => sum + v.amount, 0);

  // zip candidate data with votes
  const votes = useMemo((): CandidateBreakdown[] => {
    const breakdown: CandidateBreakdown[] = [];

    for (const vote of user.votes) {
      // handle unrevealed votes
      if (vote.candidateId === null) {
        breakdown.push({
          id: vote.id,
          comoAmount: vote.amount,
          candidate: null,
        });

        continue;
      }

      const candidate = candidates[vote.candidateId];
      if (!candidate) continue;

      breakdown.push({
        id: vote.id,
        comoAmount: vote.amount,
        candidate: {
          title: candidate.content.title,
          imageUrl: candidate.content.imageUrl,
        },
      });
    }

    return breakdown.sort((a, b) => b.comoAmount - a.comoAmount);
  }, [user.votes, candidates]);

  const visibleVotes = votes.slice(0, 3);
  const hiddenVotes = votes.slice(3);

  return (
    <div className="flex h-12 w-full items-center rounded-lg bg-secondary/70 px-4 transition-all hover:bg-secondary">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{nickname}</span>
        <span className="text-xs">{totalComo.toLocaleString()} COMO</span>
      </div>

      <span className="ml-auto flex items-center gap-1">
        <span className="flex flex-row-reverse items-center -space-x-3 space-x-reverse">
          {visibleVotes.toReversed().map((vote) => (
            <VoteAvatar key={vote.id} vote={vote} />
          ))}
        </span>
        {hiddenVotes.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded bg-accent text-xs font-semibold ring ring-secondary"
              >
                +{hiddenVotes.length}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="max-h-56 w-auto min-w-52 gap-1 overflow-y-auto p-2"
            >
              {hiddenVotes.map((vote) => (
                <HiddenVoteRow key={vote.id} vote={vote} />
              ))}
            </PopoverContent>
          </Popover>
        )}
      </span>
    </div>
  );
}

function VoteAvatar({ vote }: { vote: CandidateBreakdown }) {
  return (
    <TooltipProvider>
      {vote.candidate !== null ? (
        <Tooltip>
          <TooltipTrigger>
            <Avatar className="size-8 rounded bg-accent ring ring-secondary">
              <AvatarFallback>{vote.candidate.title.at(0)}</AvatarFallback>
              <AvatarImage
                src={vote.candidate.imageUrl}
                alt={vote.candidate.title}
              />
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col">
            <span className="font-semibold">{vote.candidate.title}</span>
            <span className="text-xs">
              {vote.comoAmount.toLocaleString()} COMO
            </span>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger>
            <div className="flex size-8 items-center justify-center rounded bg-accent ring ring-secondary">
              <IconQuestionMark className="size-5 text-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col">
            <span className="font-semibold italic">
              {m.gravity_unrevealed()}
            </span>
            <span className="text-xs">
              {vote.comoAmount.toLocaleString()} COMO
            </span>
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
}

function HiddenVoteRow({ vote }: { vote: CandidateBreakdown }) {
  if (vote.candidate === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded bg-accent">
          <IconQuestionMark className="size-4 text-foreground" />
        </div>
        <span className="flex-1 truncate text-sm font-medium italic">
          {m.gravity_unrevealed()}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {vote.comoAmount.toLocaleString()} COMO
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6 rounded">
        <AvatarFallback>{vote.candidate.title.at(0)}</AvatarFallback>
        <AvatarImage src={vote.candidate.imageUrl} alt={vote.candidate.title} />
      </Avatar>
      <span className="flex-1 truncate text-sm font-medium">
        {vote.candidate.title}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {vote.comoAmount.toLocaleString()} COMO
      </span>
    </div>
  );
}
