import {
  CornerOverlay,
  OverlayActionRow,
  OverlayHoverTarget,
  OverlayIcon,
  OverlayIconButton,
  OverlayStatusRail,
} from "@/components/objekt/overlay/corner-overlay";
import OverlayStatus from "@/components/objekt/overlay/overlay-status";
import useOverlayHover from "@/hooks/use-overlay-hover";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { IconTags } from "@tabler/icons-react";
import RemoveFromList from "./remove-from-list";

type Props = {
  id: string;
  collection: Objekt.Collection;
  objektList: ObjektList;
  // sale lists only: opens every seller's listing of the collection
  onViewListings?: () => void;
};

export default function ListOverlay({
  id,
  collection,
  objektList,
  onViewListings,
}: Props) {
  const [hoverState, createHoverProps, hoverContainerProps] = useOverlayHover();

  return (
    <CornerOverlay corner="top-left" {...hoverContainerProps}>
      <OverlayActionRow>
        {onViewListings && (
          <OverlayHoverTarget {...createHoverProps("listings")}>
            <OverlayIconButton
              onClick={onViewListings}
              className="outline-hidden"
              aria-label={m.objekt_overlay_view_listings()}
            >
              <OverlayIcon icon={IconTags} />
            </OverlayIconButton>
          </OverlayHoverTarget>
        )}

        <OverlayHoverTarget {...createHoverProps("remove")}>
          <RemoveFromList
            id={id}
            collection={collection}
            objektList={objektList}
          />
        </OverlayHoverTarget>
      </OverlayActionRow>

      <OverlayStatusRail>
        <OverlayStatus>
          {hoverState === "listings"
            ? m.objekt_overlay_view_listings()
            : m.objekt_overlay_remove_from_list()}
        </OverlayStatus>
      </OverlayStatusRail>
    </CornerOverlay>
  );
}
