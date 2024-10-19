"use client";

import {
  CosmoOngoingGravity,
  CosmoPollChoices,
  CosmoPollUpcoming,
  PollChoice,
  PollViewDefaultContent,
} from "@/lib/universal/cosmo/gravity";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ReactNode, Suspense, useState } from "react";
import Image from "next/image";
import { baseUrl, cn } from "@/lib/utils";
import { ofetch } from "ofetch";
import Skeleton from "../skeleton/skeleton";

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
          <Suspense
            key={poll.id}
            fallback={<Skeleton className="h-12 w-full" />}
          >
            <VoteDialog gravity={gravity} poll={poll} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}

type VoteDialogProps = {
  gravity: CosmoOngoingGravity;
  poll: CosmoPollUpcoming;
};

function VoteDialog({ gravity, poll }: VoteDialogProps) {
  const [selected, setSelected] = useState<PollChoice>();
  const [open, setOpen] = useState(false);

  const { data } = useSuspenseQuery({
    queryKey: ["gravity-poll", gravity.artist, gravity.id, poll.id],
    queryFn: async () => {
      const url = new URL(
        `/api/gravity/v3/${gravity.artist}/gravity/${gravity.id}/polls/${poll.id}`,
        baseUrl()
      );
      return await ofetch<CosmoPollChoices>(url.toString());
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="cosmo">Start {poll.title}</Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-6 items-center overflow-y-scroll">
        <h3 className="text-lg font-bold">{selected?.title ?? poll.title}</h3>

        {selected === undefined ? (
          <DefaultContent content={data.pollViewMetadata.defaultContent} />
        ) : (
          <ChoiceRenderer choice={selected} />
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
                <Image src={choice.txImageUrl} alt={choice.title} fill={true} />
              </div>

              <div className="flex flex-col justify-between items-start text-start">
                <h3 className="font-bold">{choice.title}</h3>
                <p className="text-white/75 text-xs">{choice.description}</p>
              </div>
            </button>
          ))}
        </div>
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
