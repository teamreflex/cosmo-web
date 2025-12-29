import { Objekt } from "@/lib/universal/objekt-conversion";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { useMemo } from "react";
import ExpandableObjekt from "../../objekt/objekt-expandable";
import { LegacyOverlay } from "./common-legacy";

type Props = {
  item: CosmoObjekt;
  id: string;
  isPin: boolean;
  priority: boolean;
  authenticated: boolean;
};

export function BlockchainGridItem({
  item,
  id,
  isPin,
  priority,
  authenticated,
}: Props) {
  const objekt = useMemo(() => Objekt.fromLegacy(item), [item]);

  return (
    <ExpandableObjekt
      collection={objekt.collection}
      tokenId={id}
      priority={priority}
    >
      <LegacyOverlay
        collection={objekt.collection}
        token={objekt.objekt}
        authenticated={authenticated}
        isPin={isPin}
      />
    </ExpandableObjekt>
  );
}
