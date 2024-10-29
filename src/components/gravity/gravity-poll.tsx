"use client";

import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { CosmoPollChoices } from "@/lib/universal/cosmo/gravity";
import { baseUrl, getPollStatus } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import { ofetch } from "ofetch";
import VoteDialog from "./gravity-vote";

type GravityPollProps = {
  title: string;
  artist: CosmoArtist;
  gravityId: number;
  pollId: number;
};

export default function GravityPoll({
  title,
  artist,
  gravityId,
  pollId,
}: GravityPollProps) {
  const { data } = useSuspenseQuery({
    queryKey: ["gravity-poll", artist.name, gravityId, pollId],
    queryFn: async () => {
      const url = new URL(
        `/api/gravity/v3/${artist.name}/gravity/${gravityId}/polls/${pollId}`,
        baseUrl()
      );
      return await ofetch<CosmoPollChoices>(url.toString());
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
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
