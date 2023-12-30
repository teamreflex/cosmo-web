import {
  DecodedTokenBalance,
  fetchTokenBalances,
} from "@/lib/server/alchemy/erc20";
import { getArtists } from "@/app/data-fetching";
import ArtistIcon from "../artist-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";

type Props = {
  address: string;
};

export default async function ComoBalances({ address }: Props) {
  const artists = await getArtists();
  const balances = await fetchTokenBalances({
    address,
    contracts: artists.map((artist) => artist.contracts.Como),
  });

  return (
    <div className="flex flex-row gap-2">
      {artists.map((artist) => (
        <ComoBalance
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

function ComoBalance({
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
