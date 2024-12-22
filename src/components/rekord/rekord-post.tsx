"use client";
import { CosmoRekordItem, CosmoRekordPost } from "@/lib/universal/cosmo/rekord";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { PropsWithClassName, cn } from "@/lib/utils";
import { TbLoader2 } from "react-icons/tb";
import ScaledImage from "../scaled-image";
import RekordLikeButton from "./rekord-like";
import Link from "next/link";
import { ReactNode, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";

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
  const [isLiked, setIsLiked] = useState(item.post.isLikedPost);
  const { name } = extractMember(item.post);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          className={cn(
            className,
            "relative embla__slide mx-2 flex flex-col justify-between gap-2 aspect-photocard rounded-lg cursor-pointer"
          )}
        >
          {showStatus && item.post.isBlinded && (
            <div className="absolute z-20 w-full h-full rounded-lg bg-red-500/50 backdrop-blur flex items-center justify-center px-2">
              <span className="font-semibold drop-shadow-sm">Hidden</span>
            </div>
          )}

          {showStatus && item.post.isExpired && (
            <div className="absolute z-20 w-full h-full rounded-lg bg-black/50 flex items-center justify-center px-2">
              <span className="font-semibold drop-shadow-sm">Expired</span>
            </div>
          )}

          <Image
            src={item.post.image.thumbnail}
            alt={item.post.artist.title}
            fill={true}
            className="object-cover rounded-lg"
            unoptimized
          />

          <div className="absolute w-full h-full rounded-lg bg-linear-to-b from-transparent to-black/50" />

          {children}
        </button>
      </DrawerTrigger>

      <DrawerContent className="p-0 md:max-w-sm md:mx-auto">
        <DrawerHeader className="text-left px-6 pt-4">
          <DrawerTitle>{name}</DrawerTitle>
          <DrawerDescription>
            by{" "}
            <Link href={`/@${item.post.owner.nickname}`} className="underline">
              {item.post.owner.nickname}
            </Link>
          </DrawerDescription>
        </DrawerHeader>

        <div className="relative w-full max-h-[80dvh]">
          <div className="absolute z-20 w-full h-24 bg-linear-to-t from-transparent to-black/50" />

          <div className="absolute w-full py-6 flex justify-center">
            <TbLoader2 className="h-12 w-12 animate-spin" />
          </div>

          <div className="relative h-full aspect-auto">
            <ScaledImage
              className="object-contain"
              src={item.post.image.large}
              alt={item.post.artist.title}
              unoptimized={true}
            />
          </div>

          <RekordLikeButton
            post={item.post}
            isLiked={isLiked}
            setIsLiked={setIsLiked}
          />
          <RekordMemberImage
            post={item.post}
            className="z-30 absolute top-2 left-3"
          />
        </div>
      </DrawerContent>
    </Drawer>
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
