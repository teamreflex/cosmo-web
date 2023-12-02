import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { IndexedObjekt } from "@/lib/universal/objekts";
import { createContext } from "react";

export type ValidObjekt = OwnedObjekt | IndexedObjekt;

export function isOwnedObjekt(objekt: ValidObjekt): objekt is OwnedObjekt {
  return "status" in objekt;
}

export type ObjektContext<TObjekt extends ValidObjekt> = {
  objekt: TObjekt;
  authenticated: boolean;
};
export const ObjektContext = createContext<ObjektContext<ValidObjekt> | null>(
  null
);
