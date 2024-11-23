import { fetchTokenBalances } from "@/lib/server/como";
import ArtistIcon from "../artist-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { Suspense } from "react";
import { X } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { getArtistsWithMembers } from "@/app/data-fetching";
import { isAddressEqual } from "@/lib/utils";
import { ComoBalance } from "@/lib/server/db/indexer/schema";

type Props = {
  address: string;
};

export default async function ComoBalanceRenderer({ address }: Props) {
  return (
    <ErrorBoundary fallback={<ComoBalanceErrorFallback />}>
      <Suspense
        fallback={
          <div className="flex items-center gap-2">
            <div className="h-[26px] w-16 rounded bg-accent animate-pulse" />
            <div className="h-[26px] w-16 rounded bg-accent animate-pulse" />
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
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-between items-center rounded cursor-default bg-accent border border-black/30 dark:border-white/30 h-[26px] min-w-16 w-fit px-1 shadow-sm">
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
  const [artists, balances] = await Promise.all([
    getArtistsWithMembers(),
    fetchTokenBalances(address),
  ]);

  return (
    <div className="flex flex-row gap-2">
      {artists.map((artist) => (
        <Balance
          key={artist.name}
          artist={artist}
          balance={
            balances.find((b) =>
              isAddressEqual(b.contract, artist.contracts.Como)
            )!
          }
        />
      ))}
    </div>
  );
}

function Balance({
  artist,
  balance,
}: {
  artist: CosmoArtist;
  balance?: ComoBalance;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-between items-center rounded cursor-default bg-accent border border-black/30 dark:border-white/30 h-[26px] min-w-16 w-fit px-1 shadow-sm">
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
