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
import { Heart } from "lucide-react";
import { PropsWithChildren } from "react";
import ScaledImage from "../scaled-image";

type RekordPostProps = PropsWithChildren<{
  post: CosmoRekordPost;
}>;

export function RekordPost({ post, children }: RekordPostProps) {
  const { name } = extractMember(post);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="relative embla__slide mx-2 flex flex-col justify-between gap-2 aspect-photocard w-32 max-w-[8rem] rounded-lg">
          <Image
            src={post.image.thumbnail}
            alt={post.artist.title}
            fill={true}
            className="object-cover rounded-lg"
            unoptimized
          />

          <div className="absolute z-50 w-full h-full bg-gradient-to-b from-transparent to-black/50" />

          {children}
        </button>
      </DialogTrigger>

      <DialogContent className="p-0">
        <DialogHeader className="text-left px-6 pt-4">
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>by {post.owner.nickname}</DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-full">
          <ScaledImage src={post.image.large} alt={post.artist.title} />
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
        "z-50 rounded-full overflow-hidden border border-cosmo"
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
