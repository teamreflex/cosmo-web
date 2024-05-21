import {
  DecodedTokenBalance,
  fetchTokenBalances,
} from "@/lib/server/alchemy/erc20";
import ArtistIcon from "../artist-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";
import { fetchArtists } from "@/lib/server/cosmo/artists";
import { Suspense } from "react";
import { X } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

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
          <div className="flex justify-between items-center rounded cursor-default bg-accent border border-black/30 dark:border-white/30 h-[26px] min-w-16 w-fit px-1 shadow">
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
  const artists = await fetchArtists();
  const balances = await fetchTokenBalances({
    address,
    contracts: artists.map((artist) => artist.contracts.Como),
  });

  return (
    <div className="flex flex-row gap-2">
      {artists.map((artist) => (
        <Balance
          key={artist.name}
          artist={artist}
          balance={
            balances.find((b) => b.contractAddress === artist.contracts.Como)!
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
  balance: DecodedTokenBalance;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-between items-center rounded cursor-default bg-accent border border-black/30 dark:border-white/30 h-[26px] min-w-16 w-fit px-1 shadow">
            <ArtistIcon artist={artist.name} />
            <span className="pl-2 text-sm">
              {balance.tokenBalance.toLocaleString()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">{artist.title} COMO</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
