import ArtistIcon from "../artist-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { Suspense } from "react";
import { X } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import {
  getArtistsWithMembers,
  getSelectedArtists,
  getTokenBalances,
} from "@/data-fetching";
import type { ComoBalance } from "@/lib/universal/como";

type Props = {
  address: string;
};

export default async function ComoBalanceRenderer({ address }: Props) {
  return (
    <ErrorBoundary fallback={<ComoBalanceErrorFallback />}>
      <Suspense
        fallback={
          <div className="flex items-center gap-2">
            <div className="h-[26px] w-16 rounded-lg bg-secondary border border-border animate-pulse" />
            <div className="h-[26px] w-16 rounded-lg bg-secondary border border-border animate-pulse" />
          </div>
        }
      >
        <UserBalances address={address} />
      </Suspense>
    </ErrorBoundary>
  );
}

function ComoBalanceErrorFallback() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-between items-center rounded-lg cursor-default bg-secondary border border-border h-[26px] min-w-16 w-fit px-1.5 shadow-sm">
            <X className="p-px w-4 h-4 text-cosmo-text" />
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

async function UserBalances({ address }: Props) {
  const artists = getArtistsWithMembers();
  const balances = await getTokenBalances(address);
  const selectedArtists = await getSelectedArtists();

  const filteredArtists =
    selectedArtists.length > 0
      ? artists.filter((artist) => selectedArtists.includes(artist.id))
      : artists;

  return (
    <div className="flex flex-row gap-2">
      {filteredArtists.map((artist) => (
        <Balance
          key={artist.name}
          artist={artist}
          balance={balances.find((b) => b.id === artist.id)!}
        />
      ))}
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-between items-center rounded-lg cursor-default bg-secondary border border-border h-[26px] min-w-16 w-fit px-1.5">
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
