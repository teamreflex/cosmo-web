"use client";

import {
  useLiveData,
  useSuspenseGravityPoll,
} from "@/lib/client/gravity/hooks";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import {
  CosmoOngoingGravity,
  CosmoPastGravity,
  PollSelectedContentImage,
} from "@/lib/universal/cosmo/gravity";
import { getPollStatus } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { motion } from "motion/react";
// import { useState, useEffect } from "react";

/**
 * Get the first ongoing poll with first poll as fallback.
 */
function findPoll(gravity: CosmoOngoingGravity | CosmoPastGravity) {
  const polls = gravity.polls.map((poll) => ({
    poll,
    status: getPollStatus(poll),
  }));

  return polls.find((poll) => poll.status === "ongoing") ?? polls[0];
}

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
};

export default function GravityLiveChart({ artist, gravity }: Props) {
  const { poll } = findPoll(gravity);
  const { data: fullPoll } = useSuspenseGravityPoll({
    artistName: gravity.artist,
    gravityId: gravity.id,
    pollId: poll.id,
  });
  const { isPending, comoByCandidate, totalComoUsed } = useLiveData({
    contract: artist.contracts.Governor,
    pollId: BigInt(poll.pollIdOnChain),
  });

  // const [test, setTest] = useState<Record<number, number>>(() => {
  //   return Array.from(
  //     { length: fullPoll.pollViewMetadata.selectedContent.length },
  //     () => Math.floor(Math.random() * 1000)
  //   );
  // });
  // const testTotal = Object.values(test).reduce((acc, curr) => acc + curr, 0);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setTest((prev) => {
  //       return {
  //         0: prev[0] + Math.floor(Math.random() * 1000),
  //         1: prev[1] + Math.floor(Math.random() * 1000),
  //       };
  //     });
  //   }, 1000);

  //   return () => clearInterval(interval);
  // }, []);

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 justify-center items-center py-4">
        <Loader2 className="size-12 animate-spin" />
        <span className="text-sm font-semibold">Loading live data...</span>
      </div>
    );
  }

  const candidates = fullPoll.pollViewMetadata.selectedContent
    .map((content, i) => ({
      content,
      comoUsed: comoByCandidate[i],
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
            totalComoUsed={totalComoUsed}
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
    <div className="relative w-full h-20 rounded-lg px-4 flex items-center gap-4 transition-all bg-accent/70 hover:bg-accent overflow-clip">
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

      <span className="relative text-lg font-semibold">
        {props.content.content.title}
      </span>
      <span className="relative text-sm ml-auto">
        {props.candidateComoUsed.toLocaleString()} COMO ({percentage.toFixed(2)}
        %)
      </span>
    </div>
  );
}
