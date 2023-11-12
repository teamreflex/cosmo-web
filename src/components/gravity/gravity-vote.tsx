"use client";

import {
  CosmoOngoingGravity,
  CosmoPollChoices,
  PollChoice,
  PollViewDefaultContent,
  ValidArtist,
} from "@/lib/universal/cosmo";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "react-query";
import { ReactNode, useState } from "react";
import { HeartCrack, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  gravity: CosmoOngoingGravity;
  availableComo: ReactNode;
};

export default function GravityVote({ gravity, availableComo }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {availableComo}

      <div className="flex gap-2 items-center">
        {gravity.polls.map((poll) => (
          <VoteDialog
            key={poll.id}
            artist={gravity.artist}
            gravity={gravity.id}
            poll={poll.id}
            title={poll.title}
          />
        ))}
      </div>
    </div>
  );
}

function VoteDialog({
  artist,
  gravity,
  poll,
  title,
}: {
  artist: ValidArtist;
  gravity: number;
  poll: number;
  title: string;
}) {
  const [selected, setSelected] = useState<PollChoice>();
  const [open, setOpen] = useState(false);

  const { data, status } = useQuery({
    queryKey: ["poll", poll],
    queryFn: async () => {
      const response = await fetch(
        `/api/gravity/v3/${artist}/gravity/${gravity}/polls/${poll}`
      );
      if (!response.ok) {
        throw new Error("failed to fetch poll");
      }
      return (await response.json()) as CosmoPollChoices;
    },
    enabled: open,
    refetchOnWindowFocus: false,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="cosmo">Start {title}</Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-6 items-center overflow-y-scroll">
        <h3 className="text-lg font-bold">{selected?.title ?? title}</h3>

        {status === "loading" ? (
          <Loader2 className="h-12 w-12 animate-spin" />
        ) : status === "error" ? (
          <div className="flex flex-col gap-2 items-center">
            <HeartCrack className="h-12 w-12" />
            <p className="text-sm">Error fetching poll</p>
          </div>
        ) : data !== undefined ? (
          <>
            {selected === undefined ? (
              <DefaultContent content={data.pollViewMetadata.defaultContent} />
            ) : (
              <ChoiceRenderer choice={selected} />
            )}

            {selected && (
              <Button className="shadow-lg" variant="cosmo">
                Vote
              </Button>
            )}

            <div className="flex flex-col gap-2 w-full sm:w-2/3">
              {data.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => setSelected(choice)}
                  className={cn(
                    "flex gap-4 items-center rounded-lg bg-accent border-2 border-transparent transition-colors w-full p-3",
                    selected !== undefined &&
                      choice?.id === selected?.id &&
                      "border-cosmo"
                  )}
                >
                  <div className="relative aspect-square rounded-lg h-12 bg-black overflow-hidden">
                    <Image
                      src={choice.txImageUrl}
                      alt={choice.title}
                      fill={true}
                    />
                  </div>

                  <div className="flex flex-col justify-between items-start text-start">
                    <h3 className="font-bold">{choice.title}</h3>
                    <p className="text-white/75 text-xs">
                      {choice.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ChoiceRenderer({ choice }: { choice: PollChoice }) {
  return (
    <ContentImage
      image={choice.txImageUrl}
      title={choice.title}
      description={choice.description}
    />
  );
}

function DefaultContent({ content }: { content: PollViewDefaultContent }) {
  if (content.type === "image") {
    return (
      <ContentImage
        image={content.imageUrl}
        title={content.title}
        description={content.description}
      />
    );
  }

  return null;
}

function ContentImage({
  image,
  title,
  description,
}: {
  image: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="relative w-48 aspect-square rounded-lg overflow-hidden">
        <Image src={image} alt={title} fill={true} />
      </div>

      <div>
        {description.split("\n").map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </div>
    </div>
  );
}
