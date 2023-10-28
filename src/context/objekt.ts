import { createContext } from "react";

export type LockedObjektContext = {
  lockedObjekts: number[];
  lockObjekt: (tokenId: number) => void;
};
export const LockedObjektContext = createContext<LockedObjektContext | null>(
  null
);
