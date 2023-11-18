"use client";

import { cn } from "@/lib/utils";
import { PropsWithChildren, useContext } from "react";
import { ObjektContext } from "../objekt/util";
import { IndexedObjekt, ObjektList } from "@/lib/universal/objekt-index";
import AddToList from "./add-to-list";
import OverlayStatus from "../objekt/overlay-status";

type Props = {
  lists: ObjektList[];
};

export default function ListOverlay({ lists }: Props) {
  const { objekt, authenticated } = useContext(
    ObjektContext
  ) as ObjektContext<IndexedObjekt>;

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
        {/* add to list */}
        <AddToList objekt={objekt} lists={lists} />
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-[12rem] overflow-hidden transition-all">
        <OverlayStatus>Add to List</OverlayStatus>
      </div>
    </div>
  );
}
