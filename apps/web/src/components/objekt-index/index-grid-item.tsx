import { useActiveObjekt } from "@/hooks/use-active-objekt";
import { collectionKey } from "@/hooks/use-objekt-selection";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import type { ObjektList } from "@apollo/database/web/types";
import { useMemo } from "react";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { TopOverlay } from "./index-overlay";

type Props = {
  item: IndexedObjekt;
  id: string;
  priority: boolean;
  authenticated: boolean;
  objektLists: ObjektList[];
};

export function IndexGridItem({
  item,
  priority,
  authenticated,
  objektLists,
}: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);
  const { setActiveObjekt } = useActiveObjekt();

  return (
    <ExpandableObjekt
      collection={collection}
      selectionKey={collectionKey(collection.slug)}
      setActive={setActiveObjekt}
      priority={priority}
    >
      <ObjektSidebar collection={collection} />
      {authenticated && (
        <TopOverlay collection={collection} objektLists={objektLists} />
      )}
    </ExpandableObjekt>
  );
}
