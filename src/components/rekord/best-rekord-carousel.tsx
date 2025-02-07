"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { CosmoRekordTopItem } from "@/lib/universal/cosmo/rekord";
import { RekordMemberImage, RekordPost } from "./rekord-post";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  posts: CosmoRekordTopItem[];
};

export default function BestRekordCarousel({ posts }: Props) {
  const [carousel] = useEmblaCarousel({ loop: true, align: "start" }, [
    Autoplay({ delay: 10000, stopOnInteraction: false }),
  ]);

  return (
    <div className="flex flex-col w-full pb-6" ref={carousel}>
      <div className="flex w-full h-full">
        {posts
          .sort((a, b) => a.rank - b.rank)
          .map((item) => (
            <RekordTopPost key={item.post.id} item={item} />
          ))}
      </div>
    </div>
  );
}

type RekordPostProps = {
  item: CosmoRekordTopItem;
};

function RekordTopPost({ item }: RekordPostProps) {
  return (
    <RekordPost item={item}>
      <RekordMemberImage post={item.post} className="absolute top-1 left-2" />
      <RekordLikes count={item.post.totalLikeCount} />
      <RekordRank rank={item.rank} />
    </RekordPost>
  );
}

function RekordLikes({ count }: { count: number }) {
  return (
    <div className="absolute z-50 bottom-3 left-2 flex flex-row gap-2 items-center">
      <Heart className="fill-foreground h-4 w-4" />
      <span className="font-semibold text-sm">{count.toLocaleString()}</span>
    </div>
  );
}

function RekordRank({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "absolute z-50 -bottom-4 -right-2 text-5xl font-cosmo [-webkit-text-stroke:1px_#fff]",
        rank === 1 ? "text-foreground" : "text-background"
      )}
    >
      {rank}
    </span>
  );
}
