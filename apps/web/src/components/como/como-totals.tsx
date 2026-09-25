import ArtistIcon from "@/components/artist-icon";
import { useArtists } from "@/hooks/use-artists";
import { fetchObjektsWithComoQuery } from "@/lib/queries/como";
import { useSuspenseQuery } from "@tanstack/react-query";

type Props = {
  address: string;
};

export default function ComoTotals({ address }: Props) {
  const { data } = useSuspenseQuery(fetchObjektsWithComoQuery(address));
  const { artistList } = useArtists();

  return (
    <div className="flex items-center gap-3">
      {artistList.map((artist) => (
        <div className="flex items-center gap-1" key={artist.name}>
          <ArtistIcon artist={artist.name} />
          <span className="font-semibold tabular-nums">
            +
            {data
              .filter((t) => t.artistId === artist.id.toLowerCase())
              .reduce((sum, objekt) => sum + objekt.amount, 0)
              .toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
