"use client";

import { DecodedTokenBalance } from "@/lib/server/alchemy";
import { CosmoArtist, ValidArtist } from "@/lib/server/cosmo";
import { useAuthStore } from "@/store";
import { useEffect } from "react";

type Props = {
  artists: CosmoArtist[];
  balances: DecodedTokenBalance[];
};

export default function ComoBalancesClientHelper({ artists, balances }: Props) {
  const setBalances = useAuthStore((state) => state.setComoBalances);

  useEffect(() => {
    const balancesObject = artists.reduce(
      (acc, artist, index) => {
        acc[artist.name as ValidArtist] = balances[index].tokenBalance;
        return acc;
      },
      { artms: 0, tripleS: 0 }
    );
    setBalances(balancesObject);
  }, [artists, balances, setBalances]);

  return null;
}
