import { DecodedTokenBalance, fetchTokenBalances } from "@/lib/server/alchemy";
import { ValidArtist } from "@/lib/universal/cosmo";
import { getArtists } from "@/app/data-fetching";
import ArtistIcon from "../artist-icon";

export default async function ComoBalances({ address }: { address: string }) {
  const artists = await getArtists();
  const balances = await fetchTokenBalances({
    address,
    contracts: artists.map((artist) => artist.contracts.Como),
  });

  return (
    <>
      {artists.map((artist) => (
        <ComoBalance
          key={artist.name}
          artistName={artist.name as ValidArtist}
          balance={
            balances.find((b) => b.contractAddress === artist.contracts.Como)!
          }
        />
      ))}
    </>
  );
}

function ComoBalance({
  artistName,
  balance,
}: {
  artistName: ValidArtist;
  balance: DecodedTokenBalance;
}) {
  return (
    <div className="flex justify-between items-center rounded bg-accent border border-black/30 dark:border-white/30 h-[26px] w-16 px-1 shadow">
      <ArtistIcon artist={artistName} />
      <span className="text-sm">{balance.tokenBalance}</span>
    </div>
  );
}
