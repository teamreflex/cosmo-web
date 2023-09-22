"use client";

import { TokenPayload } from "@/lib/server/jwt";
import { useSettingsStore } from "@/store";
import { Suspense, useEffect } from "react";
import NewsRenderer from "./news-renderer";
import { useRouter } from "next/navigation";
import { ValidArtist } from "@/lib/server/cosmo/common";
import { Loader2 } from "lucide-react";

type Props = {
  user: TokenPayload;
};

export default function NewsContainer({ user }: Props) {
  const artist = useSettingsStore((state) => state.artist);

  const router = useRouter();

  // refresh the page when the artist changes
  useEffect(() => {
    router.refresh();
  }, [artist]);

  return (
    <Suspense fallback={<LoadingNews artist={artist ?? "artms"} />}>
      <NewsRenderer user={user} artist={artist ?? "artms"} />
    </Suspense>
  );
}

function LoadingNews({ artist }: { artist: ValidArtist }) {
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
