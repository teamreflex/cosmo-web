import {
  CornerOverlay,
  OverlayActionRow,
  OverlayStatusRail,
} from "@/components/objekt/overlay/corner-overlay";
import OverlayStatus from "@/components/objekt/overlay/overlay-status";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import RemoveFromList from "./remove-from-list";

type Props = {
  id: string;
  collection: Objekt.Collection;
  objektList: ObjektList;
};

export default function ListOverlay({ id, collection, objektList }: Props) {
  return (
    <CornerOverlay corner="top-left">
      <OverlayActionRow>
        <RemoveFromList
          id={id}
          collection={collection}
          objektList={objektList}
        />
      </OverlayActionRow>

      <OverlayStatusRail>
        <OverlayStatus>{m.objekt_overlay_remove_from_list()}</OverlayStatus>
      </OverlayStatusRail>
    </CornerOverlay>
  );
}
