import { decodeUser } from "@/app/data-fetching";
import { fetchTokenBalances } from "@/lib/server/alchemy/erc20";
import { fetchArtists } from "@/lib/server/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";

export default async function AvailableComo({
  artist,
}: {
  artist: ValidArtist;
}) {
  const user = await decodeUser();
  const artists = await fetchArtists();
  const balances = await fetchTokenBalances({
    address: user!.address,
    contracts: artists.map((artist) => artist.contracts.Como),
  });

  const balance = balances.find((b) => {
    return (
      b.contractAddress ===
      artists.find((a) => a.name === artist)?.contracts.Como
    );
  });

  if (!balance) {
    return (
      <h3 className="text-lg font-bold">
        You have 0 COMO to support this Gravity
      </h3>
    );
  }

  return (
    <h3 className="text-lg font-bold">
      You have {balance.tokenBalance} COMO to support this Gravity
    </h3>
  );
}
