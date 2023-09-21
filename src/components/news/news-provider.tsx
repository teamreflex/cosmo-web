"use client";

import { TokenPayload } from "@/lib/server/jwt";
import { useSettingsStore } from "@/store";
import { Suspense, useEffect } from "react";
import NewsContainer from "./news-container";
import { useRouter } from "next/navigation";

type Props = {
  user: TokenPayload;
};

export default function NewsProvider({ user }: Props) {
  const artist = useSettingsStore((state) => state.artist);

  const router = useRouter();

  // refresh the page when the artist changes
  useEffect(() => {
    router.refresh();
  }, [artist]);

  return (
    <Suspense fallback={<p>Loading {artist} news...</p>}>
      <NewsContainer user={user} artist={artist ?? "artms"} />
    </Suspense>
  );
}
