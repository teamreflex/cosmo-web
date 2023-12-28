import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { IndexedObjekt } from "@/lib/universal/objekts";
import { PropsWithChildren, createContext, memo } from "react";

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

type ObjektProviderProps<TObjektType extends ValidObjekt> = PropsWithChildren<{
  objekt: TObjektType;
  authenticated: boolean;
}>;

export const ObjektProvider = memo(function ObjektProvider<
  TObjektType extends ValidObjekt
>({ children, authenticated, objekt }: ObjektProviderProps<TObjektType>) {
  return (
    <ObjektContext.Provider value={{ objekt, authenticated }}>
      {children}
    </ObjektContext.Provider>
  );
});
