"use client";

import { NonTransferableReason } from "@/lib/universal/cosmo/objekts";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { ReactNode, createContext, useContext } from "react";

type ObjektFields = {
  serial: number;
  tokenId: string;
  tokenAddress: string;
  transferable: boolean;
  owner: string;
  status: "minted" | "pending";
  usedForGrid: boolean;
  lenticularPairTokenId: number;
  acquiredAt: string;
  nonTransferableReason?: NonTransferableReason;
};

type ContextProps = {
  collection: Objekt.Collection;
};

const ObjektOverlayContext = createContext<ContextProps | null>(null);

type ProviderProps = {
  children: ReactNode;
  collection: Objekt.Collection;
};

export function ObjektOverlayProvider({ children, collection }: ProviderProps) {
  return (
    <ObjektOverlayContext.Provider value={{ collection }}>
      {children}
    </ObjektOverlayContext.Provider>
  );
}

export function useObjektOverlay() {
  const ctx = useContext(ObjektOverlayContext);
  if (ctx === null) {
    throw new Error(
      "useObjektOverlay must be used within a ObjektOverlayProvider"
    );
  }

  return ctx;
}
