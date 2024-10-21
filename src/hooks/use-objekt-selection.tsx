"use client";

import SendObjekts from "@/components/overlay/send-objekts";
import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import {
  createContext,
  useContextSelector,
  ContextSelector,
} from "@fluentui/react-context-selector";
import { MutationStatus } from "@tanstack/react-query";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useState,
} from "react";

type SelectedObjekt = {
  tokenId: number;
  contract: string;
  collectionId: string;
  collectionNo: string;
  serial: number;
  thumbnailImage: string;
};

export type Selection = {
  objekt: SelectedObjekt;
  status: MutationStatus;
  recipient: CosmoPublicUser | null;
};

type ContextProps = {
  selected: Selection[];
  setSelected: Dispatch<SetStateAction<Selection[]>>;
  select: (objekt: SelectedObjekt) => void;
  update: (selection: Selection) => void;
  isSelected: (tokenId: number) => boolean;
  reset: () => void;
};

const ObjektSelectionContext = createContext<ContextProps>({
  selected: [],
  setSelected: () => {},
  select: () => {},
  update: () => {},
  isSelected: () => false,
  reset: () => {},
});

export function ObjektSelectionProvider({ children }: PropsWithChildren) {
  const [selected, setSelected] = useState<Selection[]>([]);

  const select = useCallback((objekt: SelectedObjekt) => {
    setSelected((prev) => {
      const existing = prev.find((p) => p.objekt.tokenId === objekt.tokenId);
      return existing
        ? prev.filter((p) => p.objekt.tokenId !== objekt.tokenId)
        : [
            ...prev,
            {
              objekt,
              status: "pending",
              recipient: null,
            },
          ];
    });
  }, []);

  const isSelected = useCallback(
    (tokenId: number) => {
      return selected.findIndex((p) => p.objekt.tokenId === tokenId) !== -1;
    },
    [selected]
  );

  const reset = useCallback(() => setSelected([]), []);

  const update = useCallback((selection: Selection) => {
    setSelected((prev) => {
      const existing = prev.find(
        (p) => p.objekt.tokenId === selection.objekt.tokenId
      );
      return existing
        ? prev.map((p) =>
            p.objekt.tokenId === selection.objekt.tokenId ? selection : p
          )
        : [...prev, selection];
    });
  }, []);

  return (
    <ObjektSelectionContext.Provider
      value={{ selected, setSelected, select, update, isSelected, reset }}
    >
      {children}
      <SendObjekts />
    </ObjektSelectionContext.Provider>
  );
}

export const useObjektSelection = <T,>(
  selector: ContextSelector<ContextProps, T>
) => useContextSelector(ObjektSelectionContext, selector);
