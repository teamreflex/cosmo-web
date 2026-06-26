import {
  collectionKey,
  useObjektSelection,
} from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useObjektOverlay } from "@/store";
import type { ObjektList } from "@apollo/database/web/types";
import { IconSquare, IconSquareCheckFilled } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import AddToList from "../lists/add-to-list";
import OverlayStatus from "../objekt/overlay/overlay-status";

type TopOverlayProps = {
  collection: Objekt.Collection;
  objektLists: ObjektList[];
};

export function TopOverlay({ collection, objektLists }: TopOverlayProps) {
  const isHidden = useObjektOverlay((state) => state.isHidden);
  const isSelected = useObjektSelection(
    useShallow((state) => state.isSelected(collectionKey(collection.slug))),
  );
  const select = useObjektSelection((state) => state.select);

  return (
    <div
      className={cn(
        "group absolute left-0 h-5 items-center overflow-hidden p-1 transition-all sm:h-9 sm:p-2",
        "bg-(--objekt-background-color) text-(--objekt-text-color)",
        "grid grid-flow-col grid-cols-[1fr_min-content]",
        "top-0 rounded-br-photocard",
        isHidden && "hidden",
      )}
    >
      {/* buttons */}
      <div className="flex items-center gap-2">
        {/* add to list */}
        <AddToList
          collectionName={collection.collectionId}
          slug={collection.slug}
          collectionId={collection.id}
          lists={objektLists}
        />

        {/* batch select */}
        <button
          type="button"
          onClick={() => select({ type: "collection", collection })}
          className="flex items-center transition-all hover:scale-110"
          aria-label={
            isSelected ? m.objekt_overlay_deselect() : m.objekt_overlay_select()
          }
        >
          {isSelected ? (
            <IconSquareCheckFilled className="h-3 w-3 shrink-0 sm:h-5 sm:w-5" />
          ) : (
            <IconSquare className="h-3 w-3 shrink-0 sm:h-5 sm:w-5" />
          )}
        </button>
      </div>

      {/* status text */}
      <div className="max-w-0 overflow-hidden text-xs whitespace-nowrap transition-all group-hover:max-w-[12rem]">
        <OverlayStatus>
          {isSelected ? m.objekt_overlay_deselect() : m.objekt_overlay_select()}
        </OverlayStatus>
      </div>
    </div>
  );
}
