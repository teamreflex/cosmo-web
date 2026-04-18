import { useArtists } from "@/hooks/use-artists";
import { tokenBalancesQuery } from "@/lib/queries/como";
import type { ComoBalance } from "@/lib/universal/como";
import type { CosmoArtistBFF } from "@apollo/cosmo/types/artists";
import { IconX } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import ArtistIcon from "../artist-icon";

type Props = {
  address: string;
};

export default function UserBalances(props: Props) {
  const { selected } = useArtists();
  const { data: balances } = useSuspenseQuery(
    tokenBalancesQuery(props.address),
  );

  return (
    <>
      {selected
        .sort((a, b) => a.comoTokenId - b.comoTokenId)
        .map((artist) => (
          <Balance
            key={artist.name}
            artist={artist}
            balance={balances.find((b) => b.id === artist.id)}
          />
        ))}
    </>
  );
}

export function ComoBalanceErrorFallback() {
  return (
    <div className="flex items-center gap-2 px-4 font-mono text-xs text-muted-foreground first:pl-0 last:pr-0">
      <IconX className="size-3.5" />
      <span>COMO</span>
    </div>
  );
}

function Balance({
  artist,
  balance,
}: {
  artist: CosmoArtistBFF;
  balance?: ComoBalance;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 first:pl-0 last:pr-0">
      <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        <ArtistIcon artist={artist.name} />
        <span>{artist.title}</span>
      </div>
      <span className="font-mono text-[15px] font-semibold tabular-nums">
        {balance?.amount.toLocaleString() ?? "0"}
      </span>
    </div>
  );
}
