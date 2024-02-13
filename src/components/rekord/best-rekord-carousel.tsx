"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { CosmoRekordTopPost } from "@/lib/universal/cosmo/rekord";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Image from "next/image";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import ScaledImage from "../scaled-image";

type Props = {
  posts: CosmoRekordTopPost[];
};

export default function BestRekordCarousel({ posts }: Props) {
  const [carousel] = useEmblaCarousel({ loop: true, align: "start" }, [
    Autoplay({ delay: 10000, stopOnInteraction: false }),
  ]);

  return (
    <div className="flex flex-col w-full pb-6" ref={carousel}>
      <div className="embla__container flex w-full h-full">
        {posts
          .sort((a, b) => a.rank - b.rank)
          .map((item) => (
            <RekordTopPost key={item.post.id} post={item} />
          ))}
      </div>
    </div>
  );
}

type RekordPostProps = {
  post: CosmoRekordTopPost;
};

function RekordTopPost({ post }: RekordPostProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="relative embla__slide mx-2 flex flex-col justify-between gap-2 aspect-photocard w-32 max-w-[8rem] rounded-lg">
          <Image
            src={post.post.image.thumbnail}
            alt={post.post.artist.title}
            fill={true}
            className="object-cover rounded-lg"
            unoptimized
          />

          <div className="absolute z-50 w-full h-full bg-gradient-to-b from-transparent to-black/50" />

          <MemberImage post={post} />
          <Likes count={post.post.totalLikeCount} />
          <Rank rank={post.rank} />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <Title post={post} />
          <DialogDescription>by {post.post.owner.nickname}</DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-full">
          <ScaledImage
            src={post.post.image.large}
            alt={post.post.artist.title}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Title({ post }: RekordPostProps) {
  const { name } = extractMember(post);

  return <DialogTitle>{name}</DialogTitle>;
}

function MemberImage({ post }: RekordPostProps) {
  const { name, image } = extractMember(post);

  return (
    <Avatar className="absolute z-50 top-1 left-2 rounded-full overflow-hidden border border-cosmo">
      <AvatarFallback>{name.at(0)}</AvatarFallback>
      <AvatarImage src={image}></AvatarImage>
    </Avatar>
  );
}

function Likes({ count }: { count: number }) {
  return (
    <div className="absolute z-50 bottom-3 left-2 flex flex-row gap-2 items-center">
      <Heart className="fill-foreground h-4 w-4" />
      <span className="font-semibold text-sm">{count.toLocaleString()}</span>
    </div>
  );
}

function Rank({ rank }: { rank: number }) {
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

function extractMember(post: CosmoRekordTopPost) {
  const isGroup = post.post.artistMembers.length > 1;
  const name = isGroup
    ? post.post.artist.title
    : post.post.artistMembers[0].name;
  const image = isGroup
    ? post.post.artist.profileImage
    : post.post.artistMembers[0].profileImage;

  return { name, image };
}
