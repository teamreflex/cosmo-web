"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import Album from "../album";
import { CosmoAlbumWithTracks } from "@/lib/universal/cosmo/albums";
import { useAlbums } from "@/hooks/use-oma";

type Props = {
  onSelect: (album: CosmoAlbumWithTracks) => void;
};

export default function AlbumList({ onSelect }: Props) {
  const { data, status } = useAlbums();

  if (!data || data.length === 0) {
    return (
      <p className="w-full p-2 font-semibold text-center">0 OMAs registered</p>
    );
  }

  return (
    <ScrollArea className="w-full min-h-28 max-h-96 overflow-y-auto p-2">
      <div className="grid grid-cols-2 gap-2">
        {data.map((album) => (
          <Album
            key={album.hid}
            album={album}
            onClick={() => onSelect(album)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
