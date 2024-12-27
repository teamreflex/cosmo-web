"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PropsWithChildren, useState } from "react";
import { Button } from "../ui/button";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { COSMO_ENDPOINT, ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "@/lib/server/http";
import {
  CosmoRewardItem,
  CosmoRewardList,
} from "@/lib/universal/cosmo/rewards";
import Image from "next/image";
import { ScrollArea } from "../ui/scroll-area";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "../ui/use-toast";

type Props = PropsWithChildren<{
  artist: ValidArtist;
  token: string;
}>;

export default function RewardsDialog({ children, artist, token }: Props) {
  const [open, setOpen] = useState(false);
  const { data } = useSuspenseQuery({
    queryKey: ["rewards-available", artist],
    queryFn: async () => {
      const endpoint = new URL("/bff/v1/event-rewards", COSMO_ENDPOINT);
      return await cosmo<CosmoRewardList>(endpoint.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        query: {
          tid: crypto.randomUUID(),
          artistName: artist,
        },
      });
    },
  });

  // const { count, items, claimCount } = {
  //   count: 5,
  //   items: Array.from({ length: 5 }, (_, i) => ({
  //     id: i + 1,
  //     isClaimed: false,
  //     thumbnailImage:
  //       "https://resources.cosmo.fans/images/manual-claim/2024/05/16/06/600/f41094e5add14b08a6cc1107bb59b32f20240516060340215.jpeg",
  //     title: "1st Music Show Win",
  //     category: "Gift",
  //     endedAt: "2024-05-31T14:59:00.000Z",
  //   })),
  //   claimCount: 0,
  // };

  const { count, items, claimCount } = data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Objekt Rewards</DialogTitle>
          <DialogDescription>
            You can only receive objekts during the event reward period.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-xl text-center">
            {count} items available
          </h3>

          <ScrollArea className="w-full max-h-[25rem]">
            <div className="grid grid-cols-3 gap-4">
              {items.map((item) => (
                <RewardItem key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <ClaimRewards
            artist={artist}
            token={token}
            claimCount={claimCount}
            onComplete={() => setOpen(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ClaimRewardsProps = {
  artist: ValidArtist;
  token: string;
  claimCount: number;
  onComplete: () => void;
};

function ClaimRewards({
  artist,
  token,
  claimCount,
  onComplete,
}: ClaimRewardsProps) {
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const endpoint = new URL(`/bff/v1/event-rewards`, COSMO_ENDPOINT);
      return await cosmo(endpoint.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        query: {
          tid: crypto.randomUUID(),
          artistName: artist,
        },
      });
    },
    onSuccess: () => {
      toast({
        description: "Rewards claimed successfully",
      });
      onComplete();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim rewards, COSMO might be under heavy load",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      className="w-full"
      variant="cosmo"
      disabled={claimCount === 0 || isPending}
      onClick={() => mutate()}
    >
      <span>Receive All</span>
      {isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
    </Button>
  );
}

function RewardItem({ item }: { item: CosmoRewardItem }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex relative aspect-photocard object-contain rounded-lg md:rounded-xl overflow-hidden">
        <Image src={item.thumbnailImage} alt={item.title} fill={true} />

        {item.isClaimed && (
          <div className="absolute top-0 right-0 flex w-full h-full items-center justify-center bg-accent/50 px-1 py-1 text-sm font-semibold drop-shadow-sm">
            Claimed
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <p className="font-semibold truncate">{item.title}</p>
        <p className="text-xs">{item.category}</p>
      </div>

      <div className="rounded bg-accent px-1 py-1 text-sm w-fit">
        until <Timestamp end={item.endedAt} />
      </div>
    </div>
  );
}

function Timestamp(props: { end: string }) {
  return <span>{format(new Date(props.end), "yy.MM.dd")}</span>;
}
