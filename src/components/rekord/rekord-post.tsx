import { CosmoRekordPost } from "@/lib/universal/cosmo/rekord";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { PropsWithClassName, cn } from "@/lib/utils";
import { Heart, Loader2 } from "lucide-react";
import { PropsWithChildren } from "react";
import ScaledImage from "../scaled-image";
import RekordLikeButton from "./rekord-like";

type RekordPostProps = {
  post: CosmoRekordPost;
  children: React.ReactNode;
  className?: string;
};

export function RekordPost({
  post,
  children,
  className = "w-32 max-w-32",
}: RekordPostProps) {
  const { name } = extractMember(post);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            className,
            "relative embla__slide mx-2 flex flex-col justify-between gap-2 aspect-photocard rounded-lg"
          )}
        >
          <Image
            src={post.image.thumbnail}
            alt={post.artist.title}
            fill={true}
            className="object-cover rounded-lg"
            unoptimized
          />

          <div className="absolute z-20 w-full h-full bg-gradient-to-b from-transparent to-black/50" />

          {children}
        </button>
      </DialogTrigger>

      <DialogContent className="p-0 max-h-[80dvh]">
        <DialogHeader className="text-left px-6 pt-4">
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>by {post.owner.nickname}</DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-full">
          <div className="absolute z-50 w-full h-24 bg-gradient-to-t from-transparent to-black/50" />

          <div className="absolute w-full py-6 flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
          </div>

          <ScaledImage src={post.image.large} alt={post.artist.title} />

          <RekordLikeButton post={post} />
          <RekordMemberImage
            post={post}
            className="absolute top-2 left-3 h-12 w-12"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

type RekordMemberImageProps = PropsWithClassName<{
  post: CosmoRekordPost;
}>;

export function RekordMemberImage({ className, post }: RekordMemberImageProps) {
  const { name, image } = extractMember(post);

  return (
    <Avatar
      className={cn(
        className,
        "z-20 rounded-full overflow-hidden border border-cosmo"
      )}
    >
      <AvatarFallback>{name.at(0)}</AvatarFallback>
      <AvatarImage src={image}></AvatarImage>
    </Avatar>
  );
}

function extractMember(post: CosmoRekordPost) {
  const isGroup = post.artistMembers.length > 1;
  const name = isGroup ? post.artist.title : post.artistMembers[0].name;
  const image = isGroup
    ? post.artist.profileImage
    : post.artistMembers[0].profileImage;

  return { name, image };
}
