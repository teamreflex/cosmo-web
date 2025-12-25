import { useMemo } from "react";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { ObjektSidebar } from "../objekt/common";
import ListOverlay from "./list-overlay";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import type { ObjektList } from "@apollo/database/web/types";
import { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  item: IndexedObjekt;
  id: string;
  priority: boolean;
  authenticated: boolean;
  objektList: ObjektList;
};

export function ListGridItem({
  item,
  priority,
  authenticated,
  objektList,
}: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);

  return (
    <ExpandableObjekt collection={collection} priority={priority}>
      <ObjektSidebar collection={collection} />
      {authenticated && (
        <ListOverlay
          id={item.id}
          collection={collection}
          objektList={objektList}
        />
      )}
    </ExpandableObjekt>
  );
}
