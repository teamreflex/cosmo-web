import { m } from "@/i18n/messages";
import type { AggregatedTopVote } from "@/lib/client/gravity/abstract/types";
import type { PollSelectedContentImage } from "@apollo/cosmo/types/gravity";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";

type Props = {
  votes: AggregatedTopVote[];
  candidates: PollSelectedContentImage[];
};

export default function TopVotes(props: Props) {
  return (
    <div className="flex w-full flex-col gap-2">
      <AnimatePresence initial={false}>
        {props.votes.map((vote) => (
          <motion.div
            key={vote.id}
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
            <Row vote={vote} candidate={props.candidates[vote.candidateId!]} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

type RowProps = {
  vote: AggregatedTopVote;
  candidate: PollSelectedContentImage | undefined;
};

function Row(props: RowProps) {
  const candidate = props.candidate?.content.title;
  const nickname = props.vote.username ?? props.vote.voter.substring(0, 8);

  return (
    <div className="flex h-12 w-full items-center rounded-lg bg-secondary/70 px-4 transition-all hover:bg-secondary">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{nickname}</span>
        {candidate !== undefined ? (
          <span className="text-xs">{candidate}</span>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            {m.gravity_unrevealed()}
          </span>
        )}
      </div>

      <span className="ml-auto text-sm">
        {props.vote.comoAmount.toLocaleString()} {m.common_como()}
      </span>
    </div>
  );
}
