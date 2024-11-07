"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CosmoAlbumWithTracks,
  CosmoAlbumTrack,
} from "@/lib/universal/cosmo/albums";
import Image from "next/image";
import { useMemo } from "react";

type Props = {
  album: CosmoAlbumWithTracks;
};

export default function TrackList({ album }: Props) {
  return (
    <div className="flex flex-col">
      <div className="relative w-full aspect-[16/12]">
        <Image
          src={album.albumImageThumbnailUrl}
          fill={true}
          alt={album.title}
          className="object-cover blur-lg"
        />

        <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center flex-col gap-2">
          <div className="relative aspect-square shrink-0 w-1/2 bg-accent rounded-lg overflow-hidden border border-black">
            <Image
              src={album.albumImageThumbnailUrl}
              fill={true}
              alt={album.title}
            />
          </div>
          <span className="font-semibold drop-shadow">{album.title}</span>
        </div>
      </div>

      <ScrollArea className="w-full min-h-28 max-h-96 overflow-y-auto p-2">
        <div className="flex flex-col">
          {album.albumTracks.map((track) => (
            <Track key={track.hid} track={track} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

type TrackProps = {
  track: CosmoAlbumTrack;
};

function Track({ track }: TrackProps) {
  const duration = useMemo(() => {
    const minutes = Math.floor(track.duration / 60);
    const remaining = track.duration % 60;
    const formattedSeconds = remaining.toString().padStart(2, "0");
    return `${minutes}:${formattedSeconds}`;
  }, [track]);

  return (
    <button className="grid grid-cols-[10%_auto_15%] py-[3px] rounded hover:bg-accent/40 transition-colors">
      <span className="flex items-center justify-center font-semibold">
        {track.trackNo}
      </span>
      <span className="font-semibold text-start">{track.title}</span>
      <span className="flex items-center justify-center text-foreground/80 text-sm">
        {duration}
      </span>
    </button>
  );
}
