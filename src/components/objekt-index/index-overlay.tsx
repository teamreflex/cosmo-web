import { cn } from "@/lib/utils";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import AddToList from "../lists/add-to-list";
import OverlayStatus from "../objekt/overlay/overlay-status";
import { useObjektOverlay } from "@/store";
import type { ObjektList } from "@/lib/server/db/schema";

type TopOverlayProps = {
  objekt: IndexedObjekt;
  objektLists: ObjektList[];
};

export function TopOverlay({ objekt, objektLists }: TopOverlayProps) {
  const isHidden = useObjektOverlay((state) => state.isHidden);

  return (
    <div
      className={cn(
        "absolute left-0 p-1 sm:p-2 items-center group h-5 sm:h-9 transition-all overflow-hidden",
        "text-(--objekt-text-color) bg-(--objekt-background-color)",
        "grid grid-flow-col grid-cols-[1fr_min-content]",
        "top-0 rounded-br-lg sm:rounded-br-xl",
        isHidden && "hidden"
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
      <div className="text-xs whitespace-nowrap max-w-0 group-hover:max-w-[12rem] overflow-hidden transition-all">
        <OverlayStatus>Add to List</OverlayStatus>
      </div>
    </div>
  );
}
