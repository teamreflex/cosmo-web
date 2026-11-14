import { tokenKey } from "@/hooks/use-objekt-selection";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { memo } from "react";
import ExpandableObjekt from "../../objekt/objekt-expandable";
import { LegacyOverlay } from "./common-legacy";

type Props = {
  item: Objekt.Objekt;
  id: string;
  isPin: boolean;
  priority: boolean;
  authenticated: boolean;
};

export const BlockchainGridItem = memo(function BlockchainGridItem({
  item,
  id,
  isPin,
  priority,
  authenticated,
}: Props) {
  return (
    <ExpandableObjekt
      collection={item.collection}
      selectionKey={tokenKey(Number(id))}
      priority={priority}
    >
      <LegacyOverlay
        collection={item.collection}
        token={item.objekt}
        authenticated={authenticated}
        isPin={isPin}
      />
    </ExpandableObjekt>
  );
});
