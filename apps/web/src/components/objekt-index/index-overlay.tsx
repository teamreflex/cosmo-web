import { m } from "@/i18n/messages";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import { cn } from "@/lib/utils";
import { useObjektOverlay } from "@/store";
import type { ObjektList } from "@apollo/database/web/types";
import AddToList from "../lists/add-to-list";
import OverlayStatus from "../objekt/overlay/overlay-status";

type TopOverlayProps = {
  objekt: IndexedObjekt;
  objektLists: ObjektList[];
};

export function TopOverlay({ objekt, objektLists }: TopOverlayProps) {
  const isHidden = useObjektOverlay((state) => state.isHidden);

  return (
    <div
      className={cn(
        "group absolute left-0 h-5 items-center overflow-hidden p-1 transition-all sm:h-9 sm:p-2",
        "bg-(--objekt-background-color) text-(--objekt-text-color)",
        "grid grid-flow-col grid-cols-[1fr_min-content]",
        "top-0 rounded-br-lg sm:rounded-br-xl",
        isHidden && "hidden",
      )}
    >
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
      <div className="max-w-0 overflow-hidden text-xs whitespace-nowrap transition-all group-hover:max-w-[12rem]">
        <OverlayStatus>{m.objekt_overlay_add_to_list()}</OverlayStatus>
      </div>
    </div>
  );
}
