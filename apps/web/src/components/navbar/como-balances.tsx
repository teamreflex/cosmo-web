import { useArtists } from "@/hooks/use-artists";
import { tokenBalancesQuery } from "@/lib/queries/como";
import type { ComoBalance } from "@/lib/universal/como";
import type { CosmoArtistBFF } from "@apollo/cosmo/types/artists";
import { IconX } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import ArtistIcon from "../artist-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type Props = {
  address: string;
};

export default function UserBalances(props: Props) {
  const { selected } = useArtists();
  const { data: balances } = useSuspenseQuery(
    tokenBalancesQuery(props.address),
  );

  return (
    <div className="flex flex-row gap-2">
      {selected
        .sort((a, b) => a.comoTokenId - b.comoTokenId)
        .map((artist) => (
          <Balance
            key={artist.name}
            artist={artist}
            balance={balances.find((b) => b.id === artist.id)}
          />
        ))}
    </div>
  );
}

export function ComoBalanceErrorFallback() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-[26px] w-fit min-w-16 cursor-default items-center justify-between rounded-lg border border-border bg-secondary px-1.5 shadow-sm">
            <IconX className="h-4 w-4 p-px text-cosmo-text" />
            <span className="pl-2 text-sm">COMO</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Could not fetch COMO balances
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-[26px] w-fit min-w-16 cursor-default items-center justify-between rounded-lg border border-border bg-secondary px-1.5">
            <ArtistIcon artist={artist.name} />
            <span className="pl-2 text-sm">
              {balance?.amount.toLocaleString() ?? "0"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">{artist.title} COMO</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
