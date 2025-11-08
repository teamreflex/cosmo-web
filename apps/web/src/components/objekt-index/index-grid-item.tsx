import { useMemo } from "react";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { ObjektSidebar } from "../objekt/common";
import { TopOverlay } from "./index-overlay";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import type { ObjektList } from "@/lib/server/db/schema";
import { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  item: IndexedObjekt;
  id: string;
  priority: boolean;
  authenticated: boolean;
  objektLists: ObjektList[];
  setActiveObjekt: (slug: string | undefined) => void;
};

export function IndexGridItem({
  item,
  priority,
  authenticated,
  objektLists,
  setActiveObjekt,
}: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);

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
