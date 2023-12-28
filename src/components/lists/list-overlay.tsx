"use client";

import { cn } from "@/lib/utils";
import { useContext } from "react";
import { ObjektContext } from "../objekt/context";
import { IndexedObjekt, ObjektList } from "@/lib/universal/objekts";
import OverlayStatus from "../objekt/overlay-status";
import RemoveFromList from "./remove-from-list";

type Props = {
  list: ObjektList;
};

export default function ListOverlay({ list }: Props) {
  const { objekt } = useContext(ObjektContext) as ObjektContext<IndexedObjekt>;

  return (
    <div
      className={cn(
        "absolute top-0 left-0 p-1 sm:p-2 rounded-br-lg sm:rounded-br-xl items-center group h-5 sm:h-9 transition-all overflow-hidden",
        "text-[var(--objekt-text-color)] bg-[var(--objekt-background-color)]",
        "grid grid-flow-col grid-cols-[1fr_min-content]"
      )}
    >
      {/* buttons */}
      <div className="flex items-center gap-2">
        {/* remove from list */}
        <RemoveFromList collection={objekt} list={list} />
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-[12rem] overflow-hidden transition-all">
        <OverlayStatus>Remove from List</OverlayStatus>
      </div>
    </div>
  );
}
