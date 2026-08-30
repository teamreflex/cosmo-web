import {
  CornerOverlay,
  OverlayActionRow,
  OverlayHoverTarget,
  OverlayStatusRail,
} from "@/components/objekt/overlay/corner-overlay";
import OverlayStatus from "@/components/objekt/overlay/overlay-status";
import SelectToggleButton from "@/components/objekt/overlay/select-toggle-button";
import {
  collectionKey,
  useObjektSelection,
} from "@/hooks/use-objekt-selection";
import useOverlayHover from "@/hooks/use-overlay-hover";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { useShallow } from "zustand/react/shallow";
import AddToList from "../lists/add-to-list";

type TopOverlayProps = {
  collection: Objekt.Collection;
  objektLists: ObjektList[];
};

export function TopOverlay({ collection, objektLists }: TopOverlayProps) {
  const [hoverState, createHoverProps, hoverContainerProps] = useOverlayHover();
  const isSelected = useObjektSelection(
    useShallow((state) => state.isSelected(collectionKey(collection.slug))),
  );
  const select = useObjektSelection((state) => state.select);

  return (
    <CornerOverlay corner="top-left" {...hoverContainerProps}>
      <OverlayActionRow>
        <OverlayHoverTarget {...createHoverProps("list")}>
          <AddToList
            collectionName={collection.collectionId}
            slug={collection.slug}
            collectionId={collection.id}
            lists={objektLists}
          />
        </OverlayHoverTarget>

        <OverlayHoverTarget {...createHoverProps("select")}>
          <SelectToggleButton
            isSelected={isSelected}
            onClick={() => select({ type: "collection", collection })}
          />
        </OverlayHoverTarget>
      </OverlayActionRow>

      <OverlayStatusRail>
        <OverlayStatus>
          {hoverState === "list"
            ? m.objekt_overlay_add_to_list()
            : isSelected
              ? m.objekt_overlay_deselect()
              : m.objekt_overlay_select()}
        </OverlayStatus>
      </OverlayStatusRail>
    </CornerOverlay>
  );
}
