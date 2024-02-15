import { CosmoRekordItem, CosmoRekordPost } from "@/lib/universal/cosmo/rekord";
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
import { Loader2 } from "lucide-react";
import ScaledImage from "../scaled-image";
import RekordLikeButton from "./rekord-like";
import Link from "next/link";
import { ReactNode } from "react";

type RekordPostProps<TPostType extends CosmoRekordItem> = {
  item: TPostType;
  children: ReactNode;
  className?: string;
  showStatus?: boolean;
};

export function RekordPost<TPostType extends CosmoRekordItem>({
  item,
  children,
  className = "w-32 max-w-32",
  showStatus = true,
}: RekordPostProps<TPostType>) {
  const { name } = extractMember(item.post);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            className,
            "relative embla__slide mx-2 flex flex-col justify-between gap-2 aspect-photocard rounded-lg"
          )}
        >
          {showStatus && item.post.isBlinded && (
            <div className="absolute z-20 w-full h-full rounded-lg bg-opacity-50 bg-red-500 backdrop-blur flex items-center justify-center px-2">
              <span className="font-semibold drop-shadow">Hidden</span>
            </div>
          )}

          {showStatus && item.post.isExpired && (
            <div className="absolute z-20 w-full h-full rounded-lg bg-opacity-50 bg-black flex items-center justify-center px-2">
              <span className="font-semibold drop-shadow">Expired</span>
            </div>
          )}

          <Image
            src={item.post.image.thumbnail}
            alt={item.post.artist.title}
            fill={true}
            className="object-cover rounded-lg"
            unoptimized
          />

          <div className="absolute w-full h-full bg-gradient-to-b from-transparent to-black/50" />

          {children}
        </button>
      </DialogTrigger>

      <DialogContent className="p-0 max-h-[80dvh]">
        <DialogHeader className="text-left px-6 pt-4">
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            by{" "}
            <Link href={`/@${item.post.owner.nickname}`} className="underline">
              {item.post.owner.nickname}
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-full">
          <div className="absolute z-20 w-full h-24 bg-gradient-to-t from-transparent to-black/50" />

          <div className="absolute w-full py-6 flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
          </div>

          <ScaledImage
            src={item.post.image.large}
            alt={item.post.artist.title}
          />

          <RekordLikeButton post={item.post} />
          <RekordMemberImage
            post={item.post}
            className="z-30 absolute top-2 left-3"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

type RekordMemberImageProps = PropsWithClassName<{
  post: CosmoRekordPost;
  showName?: boolean;
}>;

export function RekordMemberImage({
  className,
  post,
  showName = false,
}: RekordMemberImageProps) {
  const { name, image } = extractMember(post);

  return (
    <div className={cn(className, "flex flex-col w-fit gap-1")}>
      <Avatar className="z-20 rounded-full overflow-hidden border border-cosmo">
        <AvatarFallback>{name.at(0)}</AvatarFallback>
        <AvatarImage src={image}></AvatarImage>
      </Avatar>
      {showName && <span className="text-sm font-semibold">{name}</span>}
    </div>
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
