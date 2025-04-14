import { PollSelectedContentImage } from "@/lib/universal/cosmo/gravity";
import { motion } from "motion/react";
import Image from "next/image";

type Props = {
  content: PollSelectedContentImage[];
  comoByCandidate: Record<number, number>;
  totalComoUsed: number;
};

export default function CandidateBreakdown(props: Props) {
  const candidates = props.content
    .map((content, i) => ({
      content,
      comoUsed: props.comoByCandidate[i],
    }))
    .sort((a, b) => b.comoUsed - a.comoUsed);

  return (
    <div className="w-full flex flex-col gap-2">
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
            totalComoUsed={props.totalComoUsed}
            candidateComoUsed={candidate.comoUsed}
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
};

function CandidateRow(props: CandidateRowProps) {
  const percentage = (props.candidateComoUsed / props.totalComoUsed) * 100;

  return (
    <div className="relative w-full h-16 rounded-lg px-4 flex items-center gap-4 transition-all bg-accent/70 hover:bg-accent overflow-clip">
      <div
        className="absolute inset-0 bg-cosmo transition-all"
        style={{ width: `${percentage}%` }}
      />

      <div className="relative rounded aspect-square h-2/3">
        <Image
          src={props.content.content.imageUrl}
          alt={props.content.content.title}
          fill
          className="object-cover rounded"
        />
      </div>

      <div className="relative w-full flex flex-col justify-center sm:flex-row sm:items-center">
        <span className="text-lg font-semibold">
          {props.content.content.title}
        </span>
        <span className="text-sm sm:ml-auto">
          {props.candidateComoUsed.toLocaleString()} COMO (
          {percentage.toFixed(2)}
          %)
        </span>
      </div>
    </div>
  );
}
