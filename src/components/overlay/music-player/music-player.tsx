import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { Music } from "lucide-react";
import { decodeUser } from "@/app/data-fetching";
import { fetchAlbums } from "@/lib/server/cosmo/albums";
import { Suspense } from "react";
import { CosmoAlbum } from "@/lib/universal/cosmo/albums";
import MusicPlayerContent from "./music-player-content";

export default async function MusicPlayer() {
  return (
    <Suspense fallback={null}>
      <MusicPlayerRenderer />
    </Suspense>
  );
}

async function MusicPlayerRenderer() {
  const token = await decodeUser();
  if (!token) return null;

  const albums = await fetchAlbums(token.accessToken);

  return <MusicPlayerButton albums={albums} />;
}

type MusicPlayerButtonProps = {
  albums: CosmoAlbum[];
};

function MusicPlayerButton({ albums }: MusicPlayerButtonProps) {
  return (
    <Drawer>
      <DrawerTrigger className="flex items-center justify-center p-2 rounded-full bg-cosmo size-16 aspect-square drop-shadow ring-0 pointer-events-auto">
        <Music className="text-white size-10" />
      </DrawerTrigger>

      <MusicPlayerContent albums={albums} />
    </Drawer>
  );
}
