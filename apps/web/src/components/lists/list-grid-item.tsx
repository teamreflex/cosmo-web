import type { ObjektListItem } from "@/lib/functions/objekts/objekt-list";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { useMemo, useState } from "react";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import EditEntryDialog from "./edit-entry-dialog";
import ListOverlay from "./list-overlay";
import SaleBar from "./sale-bar";

type Props = {
  item: ObjektListItem;
  id: string;
  priority: boolean;
  authenticated: boolean;
  objektList: ObjektList & { fxRateToUsd: number | null };
};

export function ListGridItem({
  item,
  priority,
  authenticated,
  objektList,
}: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);
  const { currency, fxRateToUsd } = objektList;
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="relative">
      <div className="relative z-10 drop-shadow-md">
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
      </div>

      {currency !== null && (
        <>
          <SaleBar
            quantity={item.entryQuantity}
            price={item.entryPrice}
            currency={currency}
            medianPriceUsd={item.medianPriceUsd}
            listingCount={item.listingCount}
            fxRateToUsd={fxRateToUsd}
            backgroundColor={collection.backgroundColor}
            textColor={collection.textColor}
            onClick={authenticated ? () => setEditOpen(true) : undefined}
          />
          {authenticated && (
            <EditEntryDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              objektListId={objektList.id}
              objektListEntryId={item.id}
              quantity={item.entryQuantity}
              price={item.entryPrice}
              currency={currency}
              collectionId={collection.collectionId}
            />
          )}
        </>
      )}
    </div>
  );
}
