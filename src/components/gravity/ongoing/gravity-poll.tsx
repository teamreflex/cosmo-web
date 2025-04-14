"use client";

import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import Image from "next/image";
import VoteDialog from "./gravity-vote";
import { useSuspenseGravityPoll } from "@/lib/client/gravity/hooks";
import { getPollStatus } from "@/lib/client/gravity/util";

type GravityPollProps = {
  title: string;
  artist: CosmoArtistBFF;
  gravityId: number;
  pollId: number;
};

export default function GravityPoll({
  title,
  artist,
  gravityId,
  pollId,
}: GravityPollProps) {
  const { data } = useSuspenseGravityPoll({
    artistName: artist.id,
    gravityId,
    pollId,
  });

  const content = data.pollViewMetadata.defaultContent;
  const status = getPollStatus(data);

  return (
    <div className="md:h-44 flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 w-full rounded-lg border border-accent p-2">
      <div className="relative w-40 aspect-square shrink-0 rounded-lg overflow-hidden bg-accent">
        <Image
          src={content.imageUrl}
          alt={content.title}
          fill={true}
          className="object-cover"
        />
      </div>

      <div className="flex flex-col justify-between w-full h-full">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-center md:text-start">
            {title} - {status}
          </p>
          <h3 className="text-xl font-bold text-center md:text-start">
            {content.title}
          </h3>
          <p className="text-center md:text-start">{content.description}</p>
        </div>

        {status === "ongoing" && <VoteDialog artist={artist} poll={data} />}
      </div>
    </div>
  );
}
