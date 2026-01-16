import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import OverlayStatus from "../objekt/overlay/overlay-status";
import RemoveFromList from "./remove-from-list";

type Props = {
  id: string;
  collection: Objekt.Collection;
  objektList: ObjektList;
};

export default function ListOverlay({ id, collection, objektList }: Props) {
  return (
    <div
      className={cn(
        "group absolute top-0 left-0 h-5 items-center overflow-hidden rounded-br-lg p-1 transition-all sm:h-9 sm:rounded-br-xl sm:p-2",
        "bg-(--objekt-background-color) text-(--objekt-text-color)",
        "grid grid-flow-col grid-cols-[1fr_min-content]",
      )}
    >
      {/* buttons */}
      <div className="flex items-center gap-2">
        {/* remove from list */}
        <RemoveFromList
          id={id}
          collection={collection}
          objektList={objektList}
        />
      </div>

      {/* status text */}
      <div className="max-w-0 overflow-hidden text-xs whitespace-nowrap transition-all group-hover:max-w-[12rem]">
        <OverlayStatus>Remove from List</OverlayStatus>
      </div>
    </div>
  );
}
