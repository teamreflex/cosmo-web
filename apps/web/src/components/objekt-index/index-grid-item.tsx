import { useMemo } from "react";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { ObjektSidebar } from "../objekt/common";
import { TopOverlay } from "./index-overlay";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import type { ObjektList } from "@apollo/database/web/types";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { useActiveObjekt } from "@/hooks/use-active-objekt";

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
      setActive={setActiveObjekt}
      priority={priority}
    >
      <ObjektSidebar collection={collection} />
      {authenticated && <TopOverlay objekt={item} objektLists={objektLists} />}
    </ExpandableObjekt>
  );
}
