import { OwnedObjekt } from "@/lib/universal/cosmo";
import { IndexedObjekt } from "@/lib/universal/objekt-index";
import { createContext } from "react";

type Objekt = OwnedObjekt | IndexedObjekt;

export function isOwnedObjekt(objekt: Objekt): objekt is OwnedObjekt {
  return "status" in objekt;
}

export type ObjektContext<TObjekt extends Objekt> = {
  objekt: TObjekt;
  authenticated: boolean;
};
export const ObjektContext = createContext<ObjektContext<Objekt> | null>(null);
