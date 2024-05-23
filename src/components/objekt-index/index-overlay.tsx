"use client";

import { cn } from "@/lib/utils";
import { IndexedObjekt, ObjektList } from "@/lib/universal/objekts";
import AddToList from "../lists/add-to-list";
import OverlayStatus from "../objekt/overlay-status";

type TopOverlayProps = {
  objekt: IndexedObjekt;
  objektLists: ObjektList[];
};

export const classes = [
  "absolute left-0 p-1 sm:p-2 items-center group h-5 sm:h-9 transition-all overflow-hidden",
  "text-[var(--objekt-text-color)] bg-[var(--objekt-background-color)]",
  "grid grid-flow-col grid-cols-[1fr_min-content]",
];

export function TopOverlay({ objekt, objektLists }: TopOverlayProps) {
  return (
    <div className={cn(...classes, "top-0 rounded-br-lg sm:rounded-br-xl")}>
      {/* buttons */}
      <div className="flex items-center gap-2">
        {/* add to list */}
        <AddToList
          collectionId={objekt.collectionId}
          collectionSlug={objekt.slug}
          lists={objektLists}
        />
      </div>

      {/* status text */}
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-[12rem] overflow-hidden transition-all">
        <OverlayStatus>Add to List</OverlayStatus>
      </div>
    </div>
  );
}
