import type { LiveStatus } from "@/lib/client/gravity/abstract/types";
import type { PollSelectedContentImage } from "@apollo/cosmo/types/gravity";
import { motion } from "motion/react";

type Props = {
  content: PollSelectedContentImage[];
  comoByCandidate: Record<number, number>;
  liveStatus: LiveStatus;
  isRefreshing: boolean;
};

export default function CandidateBreakdown(props: Props) {
  const candidates = props.content
    .map((content, i) => ({
      content,
      comoUsed: props.comoByCandidate[i] ?? 0,
    }))
    .sort((a, b) => b.comoUsed - a.comoUsed);

  const totalComoUsed = candidates.reduce(
    (acc, candidate) => acc + candidate.comoUsed,
    0,
  );

  return (
    <div className="flex w-full flex-col gap-2">
      {candidates.map((candidate) => (
        <motion.div
          key={candidate.content.choiceId}
          layout
          transition={{
            duration: 0.3,
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        >
          <CandidateRow
            content={candidate.content}
            totalComoUsed={totalComoUsed}
            candidateComoUsed={candidate.comoUsed}
            liveStatus={props.liveStatus}
          />
        </motion.div>
      ))}
    </div>
  );
}

type CandidateRowProps = {
  content: PollSelectedContentImage;
  totalComoUsed: number;
  candidateComoUsed: number;
  liveStatus: LiveStatus;
};

function CandidateRow(props: CandidateRowProps) {
  const percentage =
    props.candidateComoUsed > 0
      ? (props.candidateComoUsed / props.totalComoUsed) * 100
      : 0;

  return (
    <div className="relative flex h-16 w-full items-center gap-4 overflow-clip rounded-lg bg-secondary/70 px-4 transition-all hover:bg-secondary">
      <div
        className="absolute inset-0 bg-cosmo transition-all"
        style={{ width: `${percentage}%` }}
      />

      <div className="relative aspect-square h-2/3 rounded">
        <img
          src={props.content.content.imageUrl}
          alt={props.content.content.title}
          className="absolute rounded object-cover"
        />
      </div>

      <div className="relative flex w-full flex-col justify-center sm:flex-row sm:items-center">
        <span className="text-lg font-semibold">
          {props.content.content.title}
        </span>
        {props.liveStatus !== "voting" ? (
          <span className="text-xs sm:ml-auto md:text-sm">
            {props.candidateComoUsed.toLocaleString()} COMO (
            {percentage.toFixed(2)}
            %)
          </span>
        ) : (
          <div className="sm:ml-auto"></div>
        )}
      </div>
    </div>
  );
}
