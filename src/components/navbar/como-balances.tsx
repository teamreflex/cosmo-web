import { DecodedTokenBalance, fetchTokenBalances } from "@/lib/server/alchemy";
import { CosmoArtist, ValidArtist } from "@/lib/universal/cosmo";
import { Moon, Sparkle } from "lucide-react";
import { ReactNode } from "react";
import ComoBalancesClientHelper from "./como-balances-client-helper";

export default async function ComoBalances({
  address,
  artists,
}: {
  address: string;
  artists: CosmoArtist[];
}) {
  const balances = await fetchTokenBalances({
    address,
    contracts: artists.map((artist) => artist.contracts.Como),
  });

  return (
    <>
      <ComoBalancesClientHelper artists={artists} balances={balances} />
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

const map: Record<ValidArtist, ReactNode> = {
  artms: (
    <Moon className="ring-1 p-px w-3 h-3 rounded-full text-teal-400 fill-teal-400 ring-teal-400" />
  ),
  tripleS: (
    <Sparkle className="ring-1 p-px w-3 h-3 rounded-full text-purple-300 fill-purple-300 ring-purple-300" />
  ),
};

function ComoBalance({
  artistName,
  balance,
}: {
  artistName: ValidArtist;
  balance: DecodedTokenBalance;
}) {
  return (
    <div className="flex justify-between items-center rounded bg-accent border border-black/30 dark:border-white/30 h-6 w-16 px-1 shadow">
      {map[artistName]}
      <span className="text-sm">{balance.tokenBalance}</span>
    </div>
  );
}
