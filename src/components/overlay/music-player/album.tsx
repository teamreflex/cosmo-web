import { CosmoAlbum } from "@/lib/universal/cosmo/albums";
import Image from "next/image";

type Props = {
  album: CosmoAlbum;
  onClick: () => void;
};

export default function Album({ album, onClick }: Props) {
  return (
    <div className="flex flex-col">
      <button
        onClick={onClick}
        className="relative aspect-square w-full h-full bg-accent rounded-lg overflow-hidden border border-transparent hover:border-cosmo transition-colors"
      >
        <Image
          src={album.albumImageThumbnailUrl}
          fill={true}
          alt={album.title}
        />
      </button>
      <span className="text-sm font-semibold">{album.title}</span>
      <span className="text-xs">1 owned</span>
    </div>
  );
}
