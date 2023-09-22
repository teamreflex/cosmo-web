"use client";

import { ValidArtist } from "@/lib/server/cosmo/common";
import { useSettingsStore } from "@/store";
import { Loader2 } from "lucide-react";

export function LoadingNews({ artist }: { artist: ValidArtist }) {
  const availableArtists = useSettingsStore((state) => state.availableArtists);

  const currentArtist = availableArtists[artist];

  return (
    <div className="flex flex-col gap-2 items-center py-12">
      <Loader2 className="animate-spin w-12 h-12" />
      {currentArtist !== undefined ? (
        <p>Loading news for {currentArtist.title}...</p>
      ) : (
        <p>Loading news...</p>
      )}
    </div>
  );
}
