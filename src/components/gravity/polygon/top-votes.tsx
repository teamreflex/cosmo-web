import { RevealedVote } from "@/lib/client/gravity/polygon/types";
import { PollSelectedContentImage } from "@/lib/universal/cosmo/gravity";
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";

type Props = {
  votes: RevealedVote[];
  nicknames: Record<string, string | undefined>;
  candidates: PollSelectedContentImage[];
};

export default function TopVotes(props: Props) {
  return (
    <div className="w-full flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {props.votes.map((vote) => (
          <motion.div
            key={vote.hash}
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
            <Row
              vote={vote}
              nickname={props.nicknames[vote.voter.toLowerCase()]}
              candidate={props.candidates[vote.candidateId]}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

type RowProps = {
  vote: RevealedVote;
  nickname: string | undefined;
  candidate: PollSelectedContentImage;
};

function Row(props: RowProps) {
  const nickname = props.nickname ?? props.vote.voter.substring(0, 8);

  return (
    <div className="w-full h-12 rounded-lg px-4 flex items-center transition-all bg-accent/70 hover:bg-accent">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{nickname}</span>
        <span className="text-xs">{props.candidate.content.title}</span>
      </div>

      <span className="text-sm ml-auto">
        {props.vote.comoAmount.toLocaleString()} COMO
      </span>
    </div>
  );
}
