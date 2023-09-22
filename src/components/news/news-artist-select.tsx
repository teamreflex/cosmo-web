import { CosmoArtist } from "@/lib/server/cosmo";
import Image from "next/image";
import Link from "next/link";

type Props = {
  artists: CosmoArtist[];
};

export default function NewsSelectArtist({ artists }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <h3 className="text-xl">Select an artist</h3>

      <div className="flex flex-row justify-center items-center gap-4">
        {artists.map((artist) => (
          <Link
            key={artist.name}
            href={`/news?artist=${artist.name}`}
            className="h-32 w-32 relative rounded-full border border-accent hover:border-primary transition-colors overflow-hidden"
          >
            <Image src={artist.logoImageUrl} alt={artist.title} fill={true} />
          </Link>
        ))}
      </div>
    </div>
  );
}
