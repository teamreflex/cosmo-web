"use client";

import {
  CosmoBodyHeading,
  CosmoBodyImage,
  CosmoBodySpacing,
  CosmoBodyText,
  CosmoBodyVideo,
  CosmoGravity,
} from "@/lib/universal/cosmo/gravity";
import { cn } from "@/lib/utils";
import Image from "next/image";
import GravityEventType from "./gravity-event-type";
import HLSVideo from "../misc/hls-video";

type Props = {
  gravity: CosmoGravity;
};

export default function GravityBodyRenderer({ gravity }: Props) {
  return (
    <div className="flex flex-col w-full justify-center mb-4">
      <div className="relative aspect-square w-full rounded-lg overflow-hidden">
        <Image
          className="absolute"
          src={gravity.bannerImageUrl}
          alt={gravity.title}
          fill={true}
          quality={100}
        />
        <h2 className="absolute w-full h-full text-2xl font-semibold top-0 left-0 bg-linear-to-t from-black/75 to-transparent p-3 flex items-end">
          {gravity.title}
        </h2>
      </div>

      <div className="flex flex-col gap-2 py-4">
        <GravityEventType type={gravity.type} />
        <p className="text-sm opacity-80">{gravity.description}</p>
      </div>

      {/* dynamic fragments */}
      {gravity.body.map((item, i) => {
        switch (item.type) {
          case "heading":
            return <HeadingElement key={i} item={item} />;
          case "image":
            return <ImageElement key={i} item={item} />;
          case "spacing":
            return <SpacingElement key={i} item={item} />;
          case "text":
            return <TextElement key={i} item={item} />;
          case "video":
            return <VideoElement key={i} item={item} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function SpacingElement({ item }: { item: CosmoBodySpacing }) {
  return <div style={{ height: `${item.height}px` }} />;
}

function HeadingElement({ item }: { item: CosmoBodyHeading }) {
  return (
    <h2
      className={cn(
        "flex text-xl font-cosmo mb-2",
        item.align === "center" && "justify-center",
        item.align === "right" && "justify-end"
      )}
    >
      {item.text}
    </h2>
  );
}

function ImageElement({ item }: { item: CosmoBodyImage }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{ height: `${item.height}px` }}
    >
      <Image src={item.imageUrl} fill={true} alt={item.id} />
    </div>
  );
}

function TextElement({ item }: { item: CosmoBodyText }) {
  return (
    <span
      className={cn(
        "flex flex-col",
        item.align === "center" && "text-center",
        item.align === "right" && "text-end"
      )}
    >
      {item.text.split("\n").map((text, i) => (
        <p key={i}>{text}</p>
      ))}
    </span>
  );
}

function VideoElement({ item }: { item: CosmoBodyVideo }) {
  return (
    <div className="cursor-pointer relative aspect-video">
      <HLSVideo
        videoUrl={item.videoUrl}
        thumbnailUrl={item.thumbnailImageUrl}
      />
    </div>
  );
}
