"use client";

import { ComoBalance } from "@/lib/server/db/indexer/schema";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { isAddressEqual } from "@/lib/utils";
import { ReactNode, createContext, useContext, useMemo } from "react";

type ContextProps = {
  artist: CosmoArtistBFF;
  balances: ComoBalance[];
};

const ComoContext = createContext<ContextProps | undefined>(undefined);

type ProviderProps = {
  children: ReactNode;
  artist: CosmoArtistBFF;
  balances: ComoBalance[];
};

export function ComoProvider({ children, artist, balances }: ProviderProps) {
  return <ComoContext value={{ artist, balances }}>{children}</ComoContext>;
}

export function useComo() {
  const ctx = useContext(ComoContext);
  if (ctx === undefined) {
    throw new Error("useComo must be used within a ComoProvider");
  }

  const como = useMemo(() => {
    return (
      ctx.balances.find((balance) =>
        isAddressEqual(balance.contract, ctx.artist.contracts.Como)
      )?.amount ?? 0
    );
  }, [ctx.balances, ctx.artist.contracts.Como]);

  return {
    ...ctx,
    como,
  };
}
