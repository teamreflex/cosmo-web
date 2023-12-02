"use client";

import {
  CosmoCombinationPollVoteResult,
  CosmoPollFinalized,
  CosmoSinglePollVoteResult,
} from "@/lib/universal/cosmo/gravity";
import { ordinal } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  poll: CosmoPollFinalized;
}>;

export default function GravityRankingCarousel({ children, poll }: Props) {
  const [carousel] = useEmblaCarousel();

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="p-3 pb-0">{children}</div>

      <div
        className="flex flex-col gap-2 w-full overflow-x-hidden"
        ref={carousel}
      >
        <div className="embla__container flex w-full h-full py-3 px-0">
          {poll.type === "single-poll" ? (
            <SinglePollResult result={poll.result.voteResults} />
          ) : poll.type === "combination-poll" ? (
            <CombinationPollResult result={poll.result.voteResults} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SinglePollResult({ result }: { result: CosmoSinglePollVoteResult[] }) {
  return (
    <>
      {result.map((vote) => (
        <div
          className="embla__slide mx-2 p-2 flex flex-col justify-between gap-2 aspect-photocard w-32 max-w-[8rem] bg-black rounded-lg"
          key={vote.rank}
        >
          <span className="bg-cosmo text-white text-xs px-2 py-px rounded w-fit">
            {ordinal(vote.rank)}
          </span>

          <div className="w-full aspect-square relative">
            <Image
              className="absolute"
              src={vote.votedChoice.choiceImageUrl}
              alt={vote.votedChoice.choiceName}
              fill={true}
            />
          </div>

          <div className="flex flex-col text-xs font-bold">
            <p className="text-cosmo-text">{vote.votedChoice.choiceName}</p>
            <p>{vote.votedChoice.comoUsed.toLocaleString()} COMO</p>
          </div>
        </div>
      ))}
    </>
  );
}

function CombinationPollResult({
  result,
}: {
  result: CosmoCombinationPollVoteResult[];
}) {
  return null;
}
