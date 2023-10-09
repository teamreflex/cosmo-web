"use client";

import {
  CosmoBodyHeading,
  CosmoBodyImage,
  CosmoBodySpacing,
  CosmoBodyText,
  CosmoBodyVideo,
  CosmoGravity,
} from "@/lib/server/cosmo";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import Image from "next/image";
import GravityEventType from "./gravity-event-type";
const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

type Props = {
  gravity: CosmoGravity;
};

export default function GravityBodyRenderer({ gravity }: Props) {
  return (
    <div className="flex flex-col w-full justify-center mb-4">
      <div className="relative aspect-square w-full">
        <Image
          className="absolute"
          src={gravity.bannerImageUrl}
          alt={gravity.title}
          fill={true}
          quality={100}
        />
        <h2 className="absolute text-2xl font-semibold bottom-3 left-3">
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
    <div className="relative" style={{ height: `${item.height}px` }}>
      <Image src={item.imageUrl} fill={true} alt={item.id} />
    </div>
  );
}

function TextElement({ item }: { item: CosmoBodyText }) {
  return (
    <span
      className={cn(
        "flex",
        item.align === "center" && "text-center",
        item.align === "right" && "text-end"
      )}
    >
      {item.text}
    </span>
  );
}

function VideoElement({ item }: { item: CosmoBodyVideo }) {
  return (
    <div className="cursor-pointer relative aspect-video">
      <ReactPlayer
        url={item.videoUrl}
        controls={true}
        width="100%"
        height="100%"
        config={{
          file: {
            forceSafariHLS: true,
            hlsVersion: "1.4.12",
          },
        }}
        light={
          <Image
            src={item.thumbnailImageUrl}
            alt={item.id}
            fill={true}
            className="object-contain"
            quality={100}
          />
        }
      />
    </div>
  );
}
