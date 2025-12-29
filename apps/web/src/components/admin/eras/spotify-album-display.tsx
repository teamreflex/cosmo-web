import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { spotifyAlbumQuery } from "@/lib/queries/events";
import type { SpotifyAlbum } from "@/lib/universal/events";
import { IconX } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

type Props = {
  selectedAlbum: SpotifyAlbum | null;
  spotifyAlbumId?: string;
  onClear: () => void;
};

export default function SpotifyAlbumDisplay({
  selectedAlbum,
  spotifyAlbumId,
  onClear,
}: Props) {
  if (selectedAlbum) {
    return <AlbumCard album={selectedAlbum} onClear={onClear} />;
  }

  if (spotifyAlbumId) {
    return (
      <Suspense fallback={<AlbumCardSkeleton />}>
        <SpotifyAlbumLoader albumId={spotifyAlbumId} onClear={onClear} />
      </Suspense>
    );
  }

  return null;
}

type LoaderProps = {
  albumId: string;
  onClear: () => void;
};

function SpotifyAlbumLoader({ albumId, onClear }: LoaderProps) {
  const { data } = useSuspenseQuery(spotifyAlbumQuery(albumId));

  if (!data) {
    return null;
  }

  return <AlbumCard album={data} onClear={onClear} />;
}

type AlbumCardProps = {
  album: SpotifyAlbum;
  onClear: () => void;
};

function AlbumCard({ album, onClear }: AlbumCardProps) {
  const imageUrl = album.images[2]?.url;

  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      {imageUrl && (
        <img src={imageUrl} alt={album.name} className="size-12 rounded" />
      )}
      <div className="flex flex-1 flex-col">
        <span className="font-medium">{album.name}</span>
        <span className="text-xs text-muted-foreground">
          {album.artists.map((a) => a.name).join(", ")}
        </span>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onClear}>
        <IconX className="size-4" />
      </Button>
    </div>
  );
}

function AlbumCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      <Skeleton className="size-12 rounded" />
      <div className="flex flex-1 flex-col gap-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="size-8" />
    </div>
  );
}
