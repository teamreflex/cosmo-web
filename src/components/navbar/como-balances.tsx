import {
  DecodedTokenBalance,
  fetchTokenBalances,
} from "@/lib/server/alchemy/erc20";
import { decodeUser, getArtists } from "@/app/data-fetching";
import ArtistIcon from "../artist-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CosmoArtist } from "@/lib/universal/cosmo/artists";

export default async function ComoBalances() {
  const user = await decodeUser();
  if (!user) return null;

  const artists = await getArtists();
  const balances = await fetchTokenBalances({
    address: user.address,
    contracts: artists.map((artist) => artist.contracts.Como),
  });

  return (
    <>
      {artists.map((artist) => (
        <ComoBalance
          key={artist.name}
          artist={artist}
          balance={
            balances.find((b) => b.contractAddress === artist.contracts.Como)!
          }
        />
      ))}
    </>
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
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex justify-between items-center rounded cursor-default bg-accent border border-black/30 dark:border-white/30 h-[26px] w-16 px-1 shadow">
          <ArtistIcon artist={artist.name} />
          <span className="text-sm">{balance.tokenBalance}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{artist.title} COMO</TooltipContent>
    </Tooltip>
  );
}
